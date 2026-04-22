# Aspire TypeScript AppHost status

This repository now includes a TypeScript Aspire AppHost for running Cal.com from local source instead of a prebuilt app container.

## Files

* `apphost.ts` - Aspire TypeScript AppHost
* `aspire.config.json` - AppHost language and package configuration
* `tsconfig.apphost.json` - TypeScript configuration for the AppHost

## Resources created

* `postgres` - Aspire-managed PostgreSQL server with a persistent data volume
* `calendso` - PostgreSQL database for Cal.com
* `calcom-db-deploy` - one-shot Prisma migration step
* `calcom-db-seed` - one-shot seed step
* `calcom` - source-backed JavaScript app resource running `turbo run dev --filter=@calcom/web`

## What was achieved

* Runs Cal.com from local source with a TypeScript AppHost.
* Uses Aspire-managed PostgreSQL instead of Cal.com's nested `packages/prisma/docker-compose.yml` database path.
* Replaces hard-coded runtime secrets with generated Aspire parameters for:
  * `NEXTAUTH_SECRET`
  * `CRON_API_KEY`
  * `CALENDSO_ENCRYPTION_KEY`
* Replaces hard-coded database and site URLs with Aspire resource expressions and endpoint-derived values.
* Applies Prisma migrations and runs the seed step successfully.
* Starts the Next.js development server from source and serves the app on the Aspire endpoint.

## How to run

1. Install the Aspire CLI dev channel on macOS or Linux:

```bash
curl -sSL https://aspire.dev/install.sh | bash -s -- --quality dev
```

2. Restore the AppHost dependencies:

```bash
yarn install
```

3. Start the AppHost:

```bash
aspire run
```

## Remaining limitations

* **Aspire limitation:** the current TypeScript AppHost runtime still preflights with `npm install`, which breaks this Yarn workspace monorepo without a local npm-to-yarn shim.
* **Cal.com limitation:** Cal.com appears to use Sentry/dev-console telemetry and does not expose native OTLP/OpenTelemetry configuration in this repo, so OTEL export was not wired.
* **Cal.com warning:** the seed step logs `Error adding google credentials to DB: Unexpected end of JSON input`, but the overall seed still completes.
