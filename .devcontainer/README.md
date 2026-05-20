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
- `onCreateCommand` and `updateContentCommand` run `yarn install --immutable`
  so dependencies are refreshed after Journal syncs content.
- `postStartCommand` passes Journal's preview URL into Cal's public web/auth
  URL env vars, then runs `journal-start-calcom` to bootstrap local services
  and start the web app.
- `forwardPorts` and `portsAttributes` expose port `3000` as HTTP.

## `Dockerfile`

The Dockerfile bakes in the runtime and warm setup:

- Starts from `node:20-bookworm`.
- Installs OS tooling plus local Postgres and Redis.
- Installs and configures Yarn 4 through Corepack.
- Creates `journal-start-calcom` and `journal-prepare-calcom-db` helper scripts.
- Copies the repo and runs a frozen Yarn install for warm dependency cache.
- Runs database prep at image build time.
- Sets workspace ownership to `node:node`.

## GitHub Actions Workflow

`.github/workflows/devcontainer-image-pr.yml` runs on PRs to `main` when
`.devcontainer/**` changes.

It performs:

- Build and push `linux/amd64` image to `ghcr.io/endurancelabs/cal.diy-devcontainer`.
- Smoke tests for core tooling and local Postgres startup.
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

Smoke-test the local database:

```bash
docker run --rm cal-diy-devcontainer:test bash -lc 'sudo pg_ctlcluster 15 main start && psql postgresql://postgres:postgres@localhost:5432/calendso -c "select current_database();" && sudo pg_ctlcluster 15 main stop'
```

For a full devcontainer lifecycle test, temporarily point `image` at
`cal-diy-devcontainer:test` and rebuild the devcontainer in your editor or
devcontainer CLI. Do not commit a local-only image tag.
