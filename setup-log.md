# Setup Log - cal.diy

## Environment

* OS: Windows 11
* Git Bash (MINGW64)
* Docker Desktop
* PostgreSQL (Docker)
* Yarn 4.12.0

## Completed Successfully

✅ Repository cloned

✅ Yarn 4.12.0 configured

✅ Dependencies installed successfully

✅ Docker container started successfully

✅ PostgreSQL container running on port 5450

✅ Environment variables configured

✅ Prisma migrations applied successfully

✅ Next.js application started successfully

✅ Admin setup page loaded at:
http://localhost:3000/auth/setup

---

## Issues Encountered & Resolutions

### 1. Yarn Not Installed

**Issue**

* `yarn` command was not recognized.

**Resolution**

* Installed and configured Yarn using Corepack.

---

### 2. Corepack EPERM Warning

**Issue**

* Windows permission warning while enabling Corepack.

**Resolution**

* Re-ran commands with proper permissions and continued setup.

---

### 3. Dependency & Peer Dependency Warnings

**Issue**

* Large number of peer dependency warnings during install.

**Resolution**

* Installation completed successfully despite warnings.

---

### 4. NEXTAUTH_SECRET Missing

**Issue**
Error:
`Please set NEXTAUTH_SECRET`

**Resolution**

* Added `NEXTAUTH_SECRET` to `.env`.

---

### 5. CALENDSO_ENCRYPTION_KEY Missing

**Issue**
Error:
`Please set CALENDSO_ENCRYPTION_KEY`

**Resolution**

* Generated encryption key and added it to `.env`.

---

### 6. Corrupted .env File

**Issue**

* Accidentally inserted terminal command text:
  `ls -la | grep .env`

* Docker Compose failed with:
  `unexpected character "|" in variable name`

**Resolution**

* Removed invalid line from `.env`.

---

### 7. Database Connection Failure

**Issue**
Error:
`P1001: Can't reach database server at localhost:5450`

**Resolution**

* Verified Docker container status.
* Started PostgreSQL container.

---

### 8. Prisma Database Not Initialized

**Issue**

* Login page showed Prisma runtime errors.
* User table was missing.

**Resolution**

* Ran Prisma migrations successfully.

---

### 9. 500 Error on Login Page

**Issue**

* Login page displayed:
  `500 - It's not you, it's us.`

**Cause**

* Database schema was not fully migrated.

**Resolution**

* Applied all migrations.
* Restarted development server.

---

### 10. React 19 / Next.js 16 Warning

**Issue**
Console warning:
`Accessing element.ref was removed in React 19`

**Status**

* Non-blocking warning from Cal.com dependencies.
* Application continues to work.

---

### 11. Script Tag Warning in Root Layout

**Issue**
Next.js warning regarding Script component usage.

**Status**

* Development warning only.
* Does not block application startup.

---

## Current Status

✅ Application running

✅ Database connected

✅ Migrations applied

✅ Admin onboarding page visible

✅ Ready to create first administrator account

---

## Time Taken

* Initial dependency installation: ~5 minutes
* Environment configuration & debugging: ~1–2 hours
* Final result: Application running successfully
