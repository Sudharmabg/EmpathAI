# Task List: AWS Production Setup Preparation

- [x] **1. Frontend Configuration Update**
  - [x] Update `SetPassword.jsx` to load `API_BASE` from `import.meta.env.VITE_API_BASE_URL` with a relative path default.
- [x] **2. Backend Configuration Refactoring**
  - [x] Update `application.properties` with environment variable overrides for database url, secrets, and integration ports.
- [x] **3. Containerization (Dockerfiles)**
  - [x] Create multi-stage `Dockerfile` for the Spring Boot Backend.
  - [x] Create `Dockerfile` for the FastAPI Python AI Service.
- [x] **4. CI/CD Pipeline (GitHub Actions Workflows)**
  - [x] Create `.github/workflows/deploy-backend.yml` with path filtering.
  - [x] Create `.github/workflows/deploy-ai.yml` with path filtering.
  - [x] Create `.github/workflows/deploy-frontend.yml` with path filtering.
