# EmpathAI Backend — Merged

## Prerequisites
- Java 21
- Maven 3.8+
- PostgreSQL 14+

## Setup

### 1. Database
Ensure PostgreSQL is running and that a database named `empathai` has been created (e.g. `CREATE DATABASE empathai;` if it doesn't already exist). Both the AI microservice and Java backend can share this database.

### 2. Configure your password
Edit `src/main/resources/application.properties`:
```properties
spring.datasource.password=YOUR_POSTGRES_PASSWORD
```
> Default is `root` (matching postgres superuser settings in EmpathaiAI/.env). Change if your password is different.

### 3. Run
```bash
mvn spring-boot:run
```
Backend starts at: http://localhost:8080

## Default Login (seeded on first run)
| Role         | Email                        | Password        |
|--------------|------------------------------|-----------------|
| Super Admin  | admin@empathai.com           | EmpathAI@2025!  |
| School Admin | tigps.admin@empathai.com     | Tigps@2025!     |
| School Admin | falakata.admin@empathai.com  | Falakata@2025!  |
| Content Admin| content@empathai.com         | Content@2025!   |
| Psychologist | psycho@empathai.com          | Psycho@2025!    |
| Student      | aarav@empathai.com           | GGgvwM5Gazn4    |

## API Endpoints
| Module       | Base Path           |
|--------------|---------------------|
| Auth         | /api/auth           |
| Users        | /api/users          |
| Schools      | /api/schools        |
| Curriculum   | /api/curriculum     |
| Assessment   | /api/groups, /api/questions, /api/responses, /api/analytics |

## Frontend
Frontend runs at http://localhost:5173 (Vite dev server).
Both are pre-configured to talk to each other — just run both.
