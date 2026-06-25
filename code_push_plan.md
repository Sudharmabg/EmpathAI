EmpathAI Multi-Environment Code Push & Promotion Plan
This guide outlines the standard operating procedures for developing, testing, and promoting code across the three environments (QE, UAT, and Production) using our branch-based deployment architecture.

1. Branching Model Overview
We use Git branches to correspond to target environments. Each branch is protected and triggers a deployment via GitHub Actions:

[Local Feature Branch] 
      │
      ▼ (Pull Request)
  [qe branch]       ───(GitHub Actions)───►   [QE Environment] (QA/Dev Testing)
      │
      ▼ (Pull Request)
  [uat branch]      ───(GitHub Actions)───►   [UAT Environment] (Staging/Client Review)
      │
      ▼ (Pull Request)
  [main branch]     ───(GitHub Actions)───►   [Production Environment] (Live Users)
2. Step-by-Step Promotion Workflow
Step 1: Feature Development (Local)
Always start development by branching off main to ensure you are building on the latest stable production code.

# 1. Switch to main and pull latest production code
git checkout main
git pull origin main

# 2. Create your local feature branch
git checkout -b feature/your-feature-name

# 3. Work on your feature, then stage and commit changes
git add .
git commit -m "feat: implement user feedback analytics"

# 4. Push your branch to GitHub
git push -u origin feature/your-feature-name
Step 2: Deploying to QE (Quality Engineering)
The QE environment is for automated testing and manual QA validation of active development.

Go to your repository on GitHub.
Open a Pull Request (PR) from your feature branch feature/your-feature-name to the qe branch.
Review and merge the PR.
CI/CD Action: GitHub Actions will automatically detect the push to qe and deploy to the QE ECS Fargate cluster.
[!NOTE] If you need to quickly update your feature branch after testing, just push new commits to your feature branch; they will update the active PR.

Step 3: Deploying to UAT (User Acceptance / Staging)
The UAT environment is for final pre-production validation, client approvals, and stakeholder demos.

Once the feature is verified and signed off in QE, open a PR on GitHub from the qe branch into the uat branch.
Merge the PR.
CI/CD Action: GitHub Actions will deploy the exact code to the UAT ECS Fargate cluster.
[!IMPORTANT] Never commit directly to the uat branch. Only merge from qe into uat to ensure that what you tested in QE is exactly what is promoted.

Step 4: Deploying to Production
The Production environment hosts the live system for active users.

Once the client or testing coordinator approves the build in UAT, open a PR on GitHub from the uat branch into the main branch.
Merge the PR.
CI/CD Action: GitHub Actions will build, tag as :latest, and deploy the stable code to the Production ECS Fargate cluster and sync static assets to the Production S3 Bucket.
3. Local Git Cheat Sheet
Here are typical commands you'll use to manage conflicts and keep your environment branches in sync locally.

Keeping Your Environment Branches Updated
To ensure your local environment branches track their remote counterparts:

# Update local references
git fetch --all

# Update local QE
git checkout qe
git pull origin qe

# Update local UAT
git checkout uat
git pull origin uat

# Update local Main
git checkout main
git pull origin main
Resolving Merge Conflicts During Promotion
If a merge conflict occurs when promoting from qe 
→
→ uat or uat 
→
→ main, resolve it on your local machine:

# Scenario: Conflict when merging UAT into Main
git checkout main
git pull origin main

# Checkout a temporary merge branch
git checkout -b merge/uat-to-main

# Merge uat locally to trigger conflict markers
git merge uat

# [Resolve conflict files manually in VS Code / IDE]

# After resolving, stage and commit the merge
git add .
git commit -m "merge: resolve conflicts between uat and main"

# Push the resolved merge branch
git push origin merge/uat-to-main

# On GitHub, open a PR from 'merge/uat-to-main' into 'main' and merge it.
4. Best Practices for Release Safety
[!WARNING] Database Migrations: If your changes require database schema updates, ensure the SQL scripts are compatible (backward-compatible) and run them on the target database before or simultaneously with the container deployment.

[!IMPORTANT] Environment Configurations: Adding a new API key or config variable? You must add it to the AWS SSM Parameter Store under the target namespace (e.g. /empathai/qe/NEW_KEY, /empathai/uat/NEW_KEY, /empathai/prod/NEW_KEY) before merging the code. If you merge first, the build will deploy but the container will crash due to missing properties.

[!TIP] PR Descriptions: When promoting from UAT to Main, compile a list of all features merged since the last release. This creates an automatic changelog.