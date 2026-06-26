# Database Implementation & Improvements Log

This document tracks the significant database optimizations and structural changes implemented in the backend.

## 1. Entity Inheritance Refactoring (`SINGLE_TABLE`)
- **Action**: Changed `User` and its subclasses (`Student`, `Teacher`, `SchoolAdmin`, `Psychologist`, `ContentAdmin`, `SuperAdmin`) from `InheritanceType.JOINED` to `InheritanceType.SINGLE_TABLE`.
- **Reason**: Performance optimization. `JOINED` inheritance requires a SQL `JOIN` across multiple tables for every user query, which becomes very slow at scale. `SINGLE_TABLE` uses a discriminator column (`user_role`) to quickly filter from one unified `users` table.

## 2. Proper Time Data Types
- **Action**: Refactored `bedtime` and `wakeTime` in `SleepEntry`, and `start_time` and `end_time` in `ScheduleTask` from `String` to `java.time.LocalTime`.
- **Reason**: Allows the database to understand time natively, enabling fast duration calculations and accurate sorting.

## 3. Data Type Optimizations
- **Action**: Changed `confirmed` in `AssessmentReport` from a `String` (`"Y"`/`"N"`) to a `boolean`.
- **Reason**: Saves space and standardizes boolean logic at the database level.

## 4. Initialization Scripting (`data.sql`)
- **Action**: Moved static look-up data inserts (Question Groups, Schedule Class Configs, and Schedule Rules) from hardcoded Java methods in `DataInitializer.java` to `src/main/resources/data.sql`.
- **Reason**: Database configuration data is now maintained in standard SQL, ensuring cleaner application code and easier external management.

## 5. Performance Indexing
- **Action**: Added `@Index` to 9 key entities to prevent "Full Table Scans" on frequently queried foreign keys.
- **Indexes Added**:
  - `ChatMessage`: Indexed `session_id`.
  - `SleepEntry`, `MoodEntry`, `GratitudeEntry`: Indexed `student_id`.
  - `AssessmentResponse`: Indexed `student_id` and `group_id`.
  - `AssessmentReportHistory`: Indexed `report_id`.
  - `ScheduleTask`: Indexed `student_id` and `week_start_date`.
  - `SchoolTiming`: Indexed `school_id` and `class_name`.
  - `ExamDate`: Indexed `school_id` and `class_name`.

## Future Recommendations
- **Chat Message Images**: `imageBase64` is currently stored as `TEXT`. This will eventually bloat the database severely. Consider migrating base64 images to AWS S3 (or similar cloud storage) and saving only the URL in the database.
