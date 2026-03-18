---
name: trigger-test
description: Deploy and test Trigger.dev tasks on cloud machines against local DB via ngrok tunnel. Use when you need to test task behavior (OOM, machine sizing, retries) on Trigger.dev cloud infrastructure.
allowed-tools: Bash(ngrok*), Bash(yarn deploy:trigger*), Bash(npx trigger.dev*), Bash(psql*), Bash(curl*), Bash(grep*), Bash(tar*), Bash(sudo*)
---

# Trigger.dev Cloud Testing

This skill automates the workflow for testing Trigger.dev tasks on cloud machines against your local database via an ngrok TCP tunnel. Use it to validate OOM behavior, machine sizing, retry logic, and task execution in the production Trigger.dev environment. We use production Trigger.dev environment for testing because free account allows either Development or Production environment.

## Prerequisites

- **ngrok** installed and authenticated (see installation below)
- **Local Postgres** running on port 5432
- **`TRIGGER_SECRET_KEY`** set to a **production** key (`tr_prod_*`) in root `.env` — a `tr_dev_*` key deploys to the dev environment, which is likely not what you want
- **`TRIGGER_DEV_PROJECT_REF`** set in root `.env`

## Workflow

### Step 1: Ensure ngrok is installed

Check if ngrok is available:

```bash
ngrok version
```

If not installed, install it

Then authenticate (get your token from https://dashboard.ngrok.com/get-started/your-authtoken):

```bash
ngrok config add-authtoken <YOUR_TOKEN>
```

### Step 2: Start ngrok TCP tunnel

Start an ngrok TCP tunnel to expose local Postgres:

```bash
ngrok tcp 5432 --log=stdout > /tmp/ngrok.log 2>&1 &
```

Wait a moment, then parse the tunnel endpoint:

```bash
curl -s http://localhost:4040/api/tunnels | python3 -c "
import sys, json
tunnels = json.load(sys.stdin)['tunnels']
for t in tunnels:
    if 'tcp' in t.get('proto', ''):
        url = t['public_url'].replace('tcp://', '')
        host, port = url.split(':')
        print(f'Host: {host}')
        print(f'Port: {port}')
"
```

### Step 3: Verify DB connectivity through tunnel

```bash
psql "postgresql://USER:PASSWORD@<NGROK_HOST>:<NGROK_PORT>/DATABASE" -c "SELECT 1;"
```

### Step 4: Update Trigger.dev dashboard environment variables

**This is a manual step.** Go to the Trigger.dev dashboard:

1. Navigate to your project → **Environment variables** (production environment)
2. Set `DATABASE_URL` to: `postgresql://USER:PASSWORD@<NGROK_HOST>:<NGROK_PORT>/DATABASE`
3. Set `DATABASE_DIRECT_URL` to the same value
4. Save

### Step 5: Deploy tasks

Check the SDK version to ensure CLI version matches:

```bash
grep '"@trigger.dev/sdk"' packages/features/package.json
```

Deploy to production (uses `--skip-promotion` by default):

```bash
cd packages/features && yarn deploy:trigger:prod
```

### Step 6: Activate the deployed version

Since `deploy:trigger:prod` uses `--skip-promotion`, the deployed tasks **will not be active** by default. You have two options:

**Option A: Promote the version in the dashboard**
1. Go to **Deployments** tab in the Trigger.dev dashboard
2. Find the newly deployed version
3. Click **Promote** to make it the active version

**Option B: Without promoting the version (recommended for testing)**
Set the `TRIGGER_VERSION` environment variable to the deployed version ID in local `.env` file

### Step 7: Test app locally

You should be able to now test the app locally with the new Trigger.dev tasks, running in cloud

### Step 8: Cleanup

```bash
# Stop ngrok
pkill ngrok
```

## Troubleshooting

### Tasks not visible after deploy

If tasks don't appear in the **Tasks** tab after deployment, the version hasn't been promoted. Either:
- Promote the version in **Deployments** tab, OR
- Set the `TRIGGER_VERSION` environment variable to the deployed version ID in the dashboard env vars

### Wrong environment

Verify your `TRIGGER_SECRET_KEY` prefix in `.env`:
- `tr_prod_*` → deploys to **production** environment (usually what you want)
- `tr_dev_*` → deploys to **dev** environment

### CLI version mismatch

The CLI version must match the SDK version. Check SDK version:
```bash
grep '"@trigger.dev/sdk"' packages/features/package.json
```

The `deploy:trigger:prod` script already pins the correct version (`npx trigger.dev@4.3.2`).

### ngrok tunnel disconnected

Free ngrok tier rotates URLs on restart. If the tunnel drops, restart it and update the dashboard env vars with the new host/port.

## Security Notes

- **ngrok exposes your local DB to the internet** — only run the tunnel while actively testing
- Use local dev credentials only — never expose production databases
- Stop the tunnel immediately when done (`pkill ngrok`)
- Free ngrok tier rotates URLs on restart, which limits the exposure window
