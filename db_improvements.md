# Technical Assessment: Database Schema & Relationship Improvements

**Prepared by:** Lead Software Engineer  
**Target System:** EmpathAI Backend (Spring Boot / JPA / PostgreSQL)

---

## Executive Summary
This document provides a comprehensive review of the current database schema, JPA entity configuration, and structural design patterns in the EmpathAI backend. 

Currently, the database suffers from **unnecessary join overhead** due to inheritance strategies, **severe denormalization** leading to data redundancy, and a **lack of object-relational mapping (ORM) relationships** which compromises data integrity.

Below are the detailed findings and a step-by-step optimization roadmap.

---

## 1. Architectural Issue: JPA Inheritance Strategy (`JOINED` vs. `SINGLE_TABLE`)
### Current Design
The `User` entity is mapped using `@Inheritance(strategy = InheritanceType.JOINED)`. Subclasses like `Student`, `Teacher`, `SchoolAdmin`, `Psychologist`, `ContentAdmin`, and `SuperAdmin` each have their own corresponding tables (`students`, `teachers`, `school_admins`, etc.) containing only 1–2 columns.

```
                   ┌──────────────┐
                   │    users     │
                   └──────┬───────┘
         ┌────────────────┼────────────────┬──────────────┐
         ▼                ▼                ▼              ▼
┌─────────────────┐ ┌───────────┐ ┌──────────────┐ ┌─────────────┐
│    students     │ │ teachers  │ │ school_admins │ │ super_admins│
└─────────────────┘ └───────────┘ └──────────────┘ └─────────────┘
```

### Why This Is a Bottleneck
1. **Massive Join Penalty:** Every query fetching a `User` polymorphically (such as authentication or logging checks) requires **5 `LEFT OUTER JOIN`s** across the subclass tables to resolve the exact type.
2. **Subclass Table Waste:** Subclasses like `SuperAdmin` have **zero** extra fields, and `Psychologist` or `ContentAdmin` only have `phoneNumber`. Creating separate physical tables for these is a relational anti-pattern.
3. **Write Amplification:** Creating a student requires writing to both the `users` table and the `students` table, doubling transaction log writes.

### Recommendation: Migrate to `SINGLE_TABLE`
We should flatten the hierarchy into a single `users` table using `@Inheritance(strategy = InheritanceType.SINGLE_TABLE)`. 

* **How it works:** A single table `users` contains all fields (nullable where not applicable to a subclass), and a `@DiscriminatorColumn(name = "user_role", discriminatorType = DiscriminatorType.STRING)` differentiates them.
* **Why it's better:** Zero joins. Loading any user, student, or admin is a fast single-table select.

---

## 2. Relational Integrity: Missing JPA Relationships & Foreign Keys
### Current Design
Entities throughout the codebase use raw IDs (`Long studentId`, `Long schoolId`, `Long groupId`) instead of JPA relationships (`@ManyToOne`, `@OneToMany`).
* `ScheduleTask` has `Long studentId`
* `ChatSession` has `Long studentId`
* `ChatMessage` has `Long sessionId`
* `Student` has `Long schoolId`
* `MoodEntry` has `Long studentId`
* `SleepEntry` has `Long studentId`

### The Risks
1. **Broken Referrential Integrity:** The database cannot enforce constraints. If a student is deleted, their schedule tasks, mood entries, and chat sessions remain in the DB as orphaned rows.
2. **No Cascading Operations:** Hibernate cannot automatically clean up child entities (e.g., `CascadeType.ALL` or `CascadeType.REMOVE`). Developers must write manual delete operations in services.
3. **Manual Fetching Overhead:** In service code, to get a student's school name, the developer has to manually write:
   `schoolRepository.findById(student.getSchoolId())`
   This prevents Hibernate from utilizing lazy loading or optimized join fetches, leading to **N+1 query issues**.

### Recommendation: Refactor to Proper JPA Mappings
Convert raw ID columns to object references:
```java
// Example: ScheduleTask.java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "student_id", nullable = false)
private Student student;

// Example: Student.java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "school_id")
private School school;
```
*Always use `FetchType.LAZY` to avoid eagerly loading entire object graphs.*

---

## 3. Data Redundancy & 3NF Violations (Denormalization)
### Current Design
The `student_responses` table (`AssessmentResponse` entity) duplicates massive amounts of data that are already stored in parent tables:
* Redundant fields: `student_name`, `gender`, `age`, `school_name`, `class_name`, `group_name`, `question_text`

```
  AssessmentResponse (student_responses)
  ├── student_id   ────────► Links to student
  ├── student_name ❌       (Redundant - already in users)
  ├── gender       ❌       (Redundant - already in students)
  ├── age          ❌       (Redundant - dynamic calculation)
  ├── school_name  ❌       (Redundant - already in schools)
  ├── class_name   ❌       (Redundant - already in students)
  └── question_text❌       (Redundant - already in questions)
```

### The Risks
1. **Data Inconsistency:** If a student updates their name, gender, or changes schools, all of their historical answers in the `student_responses` table will retain the **outdated** information.
2. **Storage Bloat:** Text strings like `question_text` and `school_name` consume significant disk space. In a system with 2,000+ users taking daily assessments, this table will grow to millions of rows, wasting gigabytes of storage on duplicate string data.

### Recommendation: Standardize to Third Normal Form (3NF)
Remove these redundant columns from `AssessmentResponse` and query them dynamically at runtime via joins:
* Keep only `student_id`, `question_id`, `group_id`, `response_value`, `emotion`, and `submitted_at`.
* If a report or analysis needs the student's name, class, gender, or school, perform an SQL join to the `users` and `schools` tables.

---

## 4. Sub-optimal Column Datatypes
### 4.1. Time Columns Represented as Strings
In `ScheduleTask` (`start_time`, `end_time`) and `SleepEntry` (`bedtime`, `wake_time`), time is stored as `VARCHAR` (e.g. `"09:00"`, `"22:30"`).
* **Problem:** This makes time-based queries (e.g., "Find all students sleeping after 11:00 PM") or time arithmetic (e.g., "Calculate average hours slept") extremely slow and complex to write in SQL.
* **Solution:** Convert these columns to `java.time.LocalTime` (mapped to PostgreSQL `TIME` type) or `java.time.Duration`.

### 4.2. Storing Status/Flags as Strings
In `AssessmentReport`, the `confirmed` column is stored as `VARCHAR(1)` ("Y"/"N").
* **Problem:** String comparisons are slower than boolean flags and are more prone to capitalization bugs.
* **Solution:** Map it as `boolean` or `Boolean` (`is_confirmed` in SQL mapped to `boolean`).

### 4.3. Rich JSON Columns Stored as Text
`StudentSchedulePreference` (`busy_slots`) and `AssessmentReport` (`answers_json`) are stored as `TEXT` containing serialized JSON strings.
* **Problem:** Hibernate must manually parse and serialize these as strings. You cannot index or query inside the JSON objects at the database level.
* **Solution:** If using PostgreSQL, map these columns as `@Type(JsonBinaryType.class)` to store them as native `JSONB` columns. This allows indexing keys inside the JSON (e.g., querying for specific busy days).

---

## 5. Indexing Strategy Recommendations
To ensure the system remains fast as user scale grows to 2,000+ users, ensure the following indexes are defined:

1. **Foreign Key Indexes:**
   PostgreSQL does not automatically index foreign keys. We must manually index:
   * `schedule_tasks(student_id)`
   * `chat_sessions(student_id)`
   * `chat_messages(session_id)`
   * `student_responses(student_id, question_id)`
2. **Composite Query Indexes:**
   * **Schedule lookup:** Index on `schedule_tasks(student_id, week_start_date, day_of_week)`.
   * **Weekly mood logs:** Index on `mood_entries(student_id, logged_at)`.
   * **Weekly sleep logs:** Index on `sleep_entries(student_id, logged_at)`.
