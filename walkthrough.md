# Walkthrough: AWS Production Preparation Complete

We have completed the codebase preparation for AWS Production deployment as per the system architecture requirements. Below is a summary of the changes and the guide to proceed with your AWS Cloud provisioning from scratch.

## Changes Made

### 1. Frontend
- **Modified**: [SetPassword.jsx](file:///c:/empathai_updated_new/EmpathAI/EmpathaiFrontend/src/components/SetPassword.jsx)
  - Replaced the hardcoded API port `http://localhost:8081` with `import.meta.env.VITE_API_BASE_URL || ''`.
  - This corrects the signup link validation flow locally (which proxies to the backend port `8080` via Vite server proxy) and routes requests through the CloudFront root domain in production.

### 2. Backend
- **Modified**: [application.properties](file:///c:/empathai_updated_new/EmpathAI/EmpathaiBackend/src/main/resources/application.properties)
  - Parameterized all core secrets, databases, and microservices URLs using Spring Boot `${ENV_VAR:fallback}` notation (including Postgres URLs, AI Service URL, ChromaDB URL, JWT secrets, Resend key, and OpenAI key).
  - This allows the exact same code to run locally (reverting to current defaults) and dynamically load secure parameters in AWS via ECS Task definitions.
- **Created**: [Dockerfile (Backend)](file:///c:/empathai_updated_new/EmpathAI/EmpathaiBackend/Dockerfile)
  - A secure multi-stage build starting from `maven:3.9.6-eclipse-temurin-17-alpine` to compile the Spring Boot JAR, then packaging it into `eclipse-temurin:17-jre-alpine` for the runtime container.

### 3. AI Microservice
- **Created**: [Dockerfile (AI Service)](file:///c:/empathai_updated_new/EmpathAI/EmpathaiAI/Dockerfile)
  - A lightweight container definition utilizing `python:3.10-slim`, installing essential compilers, pip requirements, and running `uvicorn` on port `8000`.

### 4. CI/CD Workflows
- **Modified**: [.github/workflows/deploy-backend.yml](file:///c:/empathai_updated_new/EmpathAI/.github/workflows/deploy-backend.yml)
- **Modified**: [.github/workflows/deploy-ai.yml](file:///c:/empathai_updated_new/EmpathAI/.github/workflows/deploy-ai.yml)
- **Modified**: [.github/workflows/deploy-frontend.yml](file:///c:/empathai_updated_new/EmpathAI/.github/workflows/deploy-frontend.yml)
  - Updated to support dynamic multi-environment promotion. Pushing to `qe`, `uat`, or `main` automatically maps to the target environment (`qe`, `uat`, or `production`) and uses GitHub Environment secrets/variables. This eliminates hardcoded values and allows safe promotion without code duplication.

---

## AWS Setup Guide: Step-by-Step From Scratch

Since you are starting from scratch and do not have an AWS account configured yet, here are the sequential steps to provision the cloud infrastructure:

### Step 1: AWS Account & Local CLI Configuration
1. **Create an AWS Account**: Register at [aws.amazon.com](https://aws.amazon.com/).
2. **Configure IAM User**:
   - Go to IAM Dashboard -> Users -> Create User.
   - Attach policy: `AdministratorAccess` (recommended for infrastructure setup).
   - Go to the user -> Security credentials tab -> Create Access Key. Choose **CLI** and download the CSV.
3. **Install AWS CLI**: Download and install the installer for Windows.
4. **Configure Local Environment**:
   - Open PowerShell and run:
     ```powershell
     aws configure
     ```
   - Input your **Access Key ID**, **Secret Access Key**, default region (e.g., `us-east-1`), and default output format (`json`).

### Step 2: Set up Core Networking (VPC)
Create a VPC (e.g. `empathai-vpc`) containing:
- **2 Public Subnets** (assigned to public route tables with an Internet Gateway).
- **2 Private Subnets** (assigned to private route tables with a NAT Gateway for outbound egress).

### Step 3: Provision Databases
1. **RDS PostgreSQL**:
   - Create a Subnet Group mapping to your private subnets.
   - Provision a PostgreSQL RDS instance (`db.t4g.micro` for Free Tier).
   - In its Security Group, only allow inbound TCP on port `5432` from the Backend ECS security group.
2. **Elastic File System (EFS) for ChromaDB**:
   - Create an Amazon EFS volume.
   - Configure EFS Mount Targets in the private subnets.
   - Allow inbound port `2049` (NFS) from the ChromaDB ECS Security Group.

### Step 4: Secrets in SSM Parameter Store
Create the following parameters in SSM Parameter Store (Systems Manager -> Parameter Store) as `SecureString` types:
- `/empathai/prod/DB_URL` -> `jdbc:postgresql://<rds-endpoint>:5432/empathai`
- `/empathai/prod/DB_USER` -> `postgres`
- `/empathai/prod/DB_PASSWORD` -> `<your-db-password>`
- `/empathai/prod/JWT_SECRET` -> `<secure-random-base64>`
- `/empathai/prod/OPENAI_API_KEY` -> `<your-openai-api-key>`
- `/empathai/prod/RESEND_API_KEY` -> `<your-resend-api-key>`

### Step 5: Container Repositories (ECR) & ECS
1. Create ECR repositories named `empathai-backend-prod` and `empathai-ai-prod`.
2. Build and push the images manually the first time, or commit code to GitHub and let the Actions run (after setting up the credentials in your GitHub Repo Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `CLOUDFRONT_DISTRIBUTION_ID`).
3. Define ECS Fargate Tasks mapping the environment variables to the SSM parameters created in Step 4. Mount the EFS volume to `/chroma/chroma` in the ChromaDB task.

### Step 6: Frontend S3 Bucket & CloudFront CDN
1. Create a private S3 bucket: `empathai-frontend-prod`.
2. Set up CloudFront with:
   - **Origin 1**: S3 bucket (with OAC enabled, block public access).
   - **Origin 2**: Application Load Balancer (ALB) routing to the ECS backend. Set path pattern `/api/*` to route to this ALB origin.
3. Configure custom error responses to redirect `404` and `403` to `/index.html` with a `200 OK` code to support SPA Router.
