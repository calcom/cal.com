# Devcontainer Configuration

This directory defines the prebuilt development container used by Journal build
for `cal.diy`.

There are three moving pieces:

- `Dockerfile` builds the Linux base image used by Journal.
- `devcontainer.json` defines the pinned image, workspace path, lifecycle
  commands, and exposed ports.
- `.github/workflows/devcontainer-image-pr.yml` builds, smoke-tests, publishes,
  and digest-pins the devcontainer image in PRs that touch devcontainer config.

Use the Dockerfile for stable system/runtime dependencies. Use
`devcontainer.json` for lightweight runtime setup that should run against the
latest synced checkout.

## `devcontainer.json`

`devcontainer.json` is runtime orchestration:

- `image` should be digest-pinned after the PR workflow runs.
- `workspaceMount` mounts a named Docker volume at `/workspace/cal.diy`.
- `workspaceFolder` sets `/workspace/cal.diy` as the working directory.
- `onCreateCommand` runs `yarn install --immutable`.
- `updateContentCommand` runs `yarn install --immutable` and applies lightweight
  Journal preview URL overrides.
- `postStartCommand` applies Journal preview URL overrides, starts and verifies
  local services, and starts the web app.
- `CALCOM_NEXT_DEV_BUNDLER=webpack` keeps preview startup on Next's webpack dev
  server. Set it to `turbopack` to retest Turbopack once the current font-loader
  resolution issue is fixed upstream or in dependencies.
- `JOURNAL_API_PORT=3000` tells Journal's build preview proxy to route Cal's
  `/api/*` requests to the Next.js server instead of a separate API process.
- `forwardPorts` and `portsAttributes` expose port `3000` as HTTP.

## `Dockerfile`

The Dockerfile bakes in the runtime and warm setup:

- Starts from `ghcr.io/endurancelabs/journal-build-base`.
- Inherits Journal browser preview tooling, Playwright headless shell wiring,
  `agent-browser`, and common CLI/dev tooling from the base image.
- Installs only Cal-specific local services: Postgres and Redis.
- Installs and configures Yarn 4 through Corepack.
- Copies `journal-start-calcom`, `journal-prepare-calcom-db`, and preview env
  override helper scripts into `/usr/local/bin`.
- Copies the repo and runs a frozen Yarn install for warm dependency cache.
- Runs database prep at image build time.
- Sets workspace ownership to `node:node`.

## GitHub Actions Workflow

`.github/workflows/devcontainer-image-pr.yml` runs on PRs to `main` when
`.devcontainer/**` changes.

It performs:

- Build and push `linux/amd64` image to
  `ghcr.io/endurancelabs/cal.diy-devcontainer`.
- Smoke tests for inherited Journal tooling, local Postgres, and local Redis.
- Digest pin update in `.devcontainer/devcontainer.json`.
- Commit back to the PR branch.
- Validation that `.image` matches digest-pinned GHCR format.

This workflow is intentionally limited to same-repo PRs (not forks) because it
needs package-push and branch-push permissions.

## Required Secret

Configure this repository secret before running the workflow:

- `GHCR_PUSH_TOKEN`: token that can push packages to
  `ghcr.io/endurancelabs/cal.diy-devcontainer` (typically PAT with `write:packages`,
  plus `read:packages`; include `repo` only if your org requires it).

## Local Testing

Local builds are for fast iteration only. Do not push local images to GHCR.
Apple Silicon machines should build and test `linux/arm64` locally, then let the
PR workflow build, test, push, and digest-pin the reviewed `linux/amd64` image.

```bash
docker buildx build --pull --platform linux/arm64 --file .devcontainer/Dockerfile --tag cal-diy-devcontainer:test --load .
```

Smoke-test the installed tools:

```bash
docker run --rm cal-diy-devcontainer:test bash -lc 'node --version && yarn --version && psql --version && redis-server --version && command -v journal-start-calcom >/dev/null && command -v journal-prepare-calcom-db >/dev/null'
```

Smoke-test inherited Journal browser tooling:

```bash
docker run --rm cal-diy-devcontainer:test bash -lc 'agent-browser --help >/dev/null && test -x "$AGENT_BROWSER_EXECUTABLE_PATH" && test -d "$PLAYWRIGHT_BROWSERS_PATH"'
```

Smoke-test local services:

```bash
docker run --rm cal-diy-devcontainer:test bash -lc 'sudo pg_ctlcluster 15 main start && psql postgresql://postgres:postgres@localhost:5432/calendso -c "select current_database();" && sudo pg_ctlcluster 15 main stop'
docker run --rm cal-diy-devcontainer:test bash -lc 'sudo service redis-server start >/dev/null && redis-cli ping'
```

Smoke-test Cal runtime:

```bash
docker run --rm --name cal-diy-smoke -p 4300:3000 -d cal-diy-devcontainer:test journal-start-calcom
curl -f -I http://127.0.0.1:4300/
docker stop cal-diy-smoke
```

For a full devcontainer lifecycle test, temporarily point `image` at
`cal-diy-devcontainer:test` and rebuild the devcontainer in your editor or
devcontainer CLI. Do not commit a local-only image tag.
