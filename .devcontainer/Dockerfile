# syntax=docker/dockerfile:1.7

ARG JOURNAL_BUILD_BASE_IMAGE=ghcr.io/endurancelabs/journal-build-base:latest
FROM ${JOURNAL_BUILD_BASE_IMAGE}

USER root

ENV DEBIAN_FRONTEND=noninteractive \
  CI=true \
  NEXT_TELEMETRY_DISABLED=1 \
  CALCOM_TELEMETRY_DISABLED=1 \
  CALCOM_NEXT_DEV_BUNDLER=webpack \
  YARN_HTTP_TIMEOUT=1200000 \
  COREPACK_HOME=/usr/local/share/corepack \
  NODE_OPTIONS=--max-old-space-size=8192 \
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/calendso \
  DATABASE_DIRECT_URL=postgresql://postgres:postgres@localhost:5432/calendso \
  NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000 \
  NEXTAUTH_URL=http://localhost:3000/api/auth \
  NEXTAUTH_SECRET=RbyBOfiZFt/IsBL2E2Zy2idcKRH+WclnHEiu1FmRdf0= \
  CALENDSO_ENCRYPTION_KEY=Lmqy57DlHKPvwwrtkwjL/8QtxJWxC/OV \
  REDIS_URL=redis://localhost:6379 \
  PORT=3000

RUN set -euo pipefail; \
  apt-get update; \
  apt-get install -y --no-install-recommends \
    postgresql \
    postgresql-client \
    redis-server; \
  rm -rf /var/lib/apt/lists/*

RUN set -euo pipefail; \
  mkdir -p "$COREPACK_HOME"; \
  corepack enable; \
  corepack prepare yarn@4.12.0 --activate; \
  chmod -R a+rX "$COREPACK_HOME"; \
  echo "node ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/node; \
  chmod 0440 /etc/sudoers.d/node; \
  git config --system --add safe.directory /workspace/cal.diy

COPY .devcontainer/scripts/journal-prepare-calcom-db /usr/local/bin/journal-prepare-calcom-db
RUN chmod +x /usr/local/bin/journal-prepare-calcom-db

WORKDIR /workspace/cal.diy
COPY . /workspace/cal.diy

RUN set -euo pipefail; \
  git config --unset-all http.https://github.com/.extraheader || true; \
  yarn config set httpTimeout 1200000; \
  CI=true yarn install --immutable; \
  yarn workspace @calcom/web run copy-app-store-static; \
  yarn cache clean --all; \
  rm -rf /tmp/xfs-* /root/.cache/node-gyp; \
  JOURNAL_SEED_DB=1 journal-prepare-calcom-db; \
  chown -R node:node /workspace/cal.diy

COPY .devcontainer/scripts/journal-start-calcom /usr/local/bin/journal-start-calcom
COPY .devcontainer/scripts/apply-build-preview-env-overrides.sh /usr/local/bin/journal-apply-calcom-preview-env-overrides
RUN chmod +x \
  /usr/local/bin/journal-start-calcom \
  /usr/local/bin/journal-apply-calcom-preview-env-overrides

USER node
