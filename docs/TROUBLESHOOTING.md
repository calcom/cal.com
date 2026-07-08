# Troubleshooting Local Development

Common issues encountered when setting up Cal.diy for local development, with causes and solutions.

For initial setup instructions, see the [README](../README.md#development).

---

## Prerequisites & Installation

### Wrong Node.js version

**Problem:** `yarn install` or `yarn dev` fails with engine compatibility errors.

**Cause:** Cal.diy requires Node.js >= 18.x.

**Solution:**

```sh
nvm install && nvm use
```

If you don't have nvm installed, see [nvm](https://github.com/nvm-sh/nvm).

---

### Wrong Yarn version

**Problem:** `yarn install` fails or behaves unexpectedly. Commands like `yarn workspace` don't work as documented.

**Cause:** The project requires Yarn >= 4.12.0 (set via `packageManager` in `package.json`). Older Yarn versions (v1/Classic) are incompatible.

**Solution:**

```sh
corepack enable
corepack prepare yarn@4.12.0 --activate
```

Verify with `yarn --version`.

---

## Environment Variables

### Missing `NEXTAUTH_SECRET` or `CALENDSO_ENCRYPTION_KEY`

**Problem:** The app fails to start or authentication doesn't work.

**Cause:** These required secrets are empty in `.env.example` by default and must be generated.

**Solution:**

```sh
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate CALENDSO_ENCRYPTION_KEY (must be 32 bytes for AES256)
openssl rand -base64 24
```

Add both values to your `.env` file.

---

### `Environment variable not found: DATABASE_DIRECT_URL`

**Problem:** Running `yarn workspace @calcom/prisma db-migrate` fails on Windows/PowerShell with:

```
Environment variable not found: DATABASE_DIRECT_URL
```

**Cause:** Turbo may fail to inject root `.env` variables on Windows.

**Solution:** Run the commands directly from the Prisma package directory:

```powershell
cd packages/prisma
$env:DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres"
$env:DATABASE_DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres"
npx prisma db push
cd ../..
```

---

## Database & Migrations

### PostgreSQL connection refused

**Problem:** `yarn dev` or Prisma commands fail with `connection refused` or `ECONNREFUSED`.

**Cause:** PostgreSQL is not running, or the `DATABASE_URL` in `.env` doesn't match your database's host/port.

**Solution:**

1. Verify PostgreSQL is running.
2. Check your `DATABASE_URL` in `.env`. The default expects port 5450:
   ```
   DATABASE_URL="postgresql://postgres:@localhost:5450/calendso"
   ```
3. If using `yarn dx`, Docker starts PostgreSQL automatically on port 5450. If using a manual setup, adjust the port to match your PostgreSQL instance.

---

### Prisma migration failures

**Problem:** `yarn workspace @calcom/prisma db-migrate` fails with schema errors or timeouts.

**Cause:** Database is unreachable, or `DATABASE_URL` and `DATABASE_DIRECT_URL` are misconfigured.

**Solution:**

1. Ensure `DATABASE_URL` and `DATABASE_DIRECT_URL` are both set in `.env`.
2. If not using a connection pooler, set both to the same value.
3. Re-run:
   ```sh
   yarn workspace @calcom/prisma db-migrate
   ```

---

### `Invalid 'prisma.user.create()' — metadata field error`

**Problem:** Creating a user via Prisma Studio fails with:

```
Failed to commit changes: Invalid 'prisma.user.create()'
```

**Cause:** The `metadata` field cannot be left completely empty in certain versions.

**Solution:** Set the `metadata` field to an empty JSON object `{}`. You can also try leaving the `id` field empty to let it auto-increment.

---

### Database seeding fails

**Problem:** `yarn db-seed` fails or produces unexpected results.

**Cause:** The database may not have the latest schema applied, or a previous partial seed left the database in an inconsistent state.

**Solution:**

```sh
# Reset the database (WARNING: destroys all data)
yarn workspace @calcom/prisma db-reset

# Or re-run migrations and seed separately
yarn workspace @calcom/prisma db-migrate
cd packages/prisma && yarn db-seed
```

---

## Windows-Specific Issues

### Symlinks not created during clone

**Problem:** On Windows, the repository doesn't work correctly after cloning. The `packages/prisma/.env` symlink may be broken.

**Cause:** Git on Windows does not create symlinks by default.

**Solution:** Clone with symlinks enabled (requires admin privileges in Git Bash):

```sh
git clone -c core.symlinks=true https://github.com/calcom/cal.diy.git
```

---

### Prisma error: `unexpected character / in variable name`

**Problem:** Prisma operations fail with:

```
unexpected character / in variable name
```

**Cause:** The `packages/prisma/.env` file is a symlink to `../../.env`. On Windows, this symlink may not resolve correctly.

**Solution:** Replace the symlink with a real copy:

```sh
# Git Bash / WSL
rm packages/prisma/.env && cp .env packages/prisma/.env
```

> **Note:** You'll need to re-copy this file whenever you change root `.env` values.

---

## Running the Dev Server

### `yarn dx` fails

**Problem:** `yarn dx` doesn't start the application.

**Cause:** `yarn dx` requires Docker and Docker Compose to be installed. It starts a local PostgreSQL instance via Docker before running the app.

**Solution:** Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) or [Rancher Desktop](https://rancherdesktop.io/), then retry `yarn dx`.

---

### Node.js heap out of memory

**Problem:** The dev server crashes with:

```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```

**Cause:** The default Node.js memory limit is too low for this monorepo.

**Solution:** Increase the memory allocation before running:

```sh
export NODE_OPTIONS="--max-old-space-size=16384"
yarn dev
```

Adjust `16384` (16 GB) based on your available RAM.

---

### Port 3000 already in use

**Problem:** `yarn dev` fails with `EADDRINUSE` or the app doesn't start.

**Cause:** Another process is using port 3000.

**Solution:**

```sh
# Find and kill the process on port 3000
lsof -ti:3000 | xargs kill -9

# Then restart
yarn dev
```
