# syntax=docker/dockerfile:1.6

FROM node:20-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
  CI=true \
  NEXT_TELEMETRY_DISABLED=1 \
  CALCOM_TELEMETRY_DISABLED=1 \
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

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    g++ \
    git \
    jq \
    less \
    libc6-dev \
    lsof \
    make \
    openssh-client \
    openssl \
    pkg-config \
    postgresql \
    postgresql-client \
    procps \
    python3 \
    redis-server \
    ripgrep \
    sudo \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p "$COREPACK_HOME" \
  && corepack enable \
  && corepack prepare yarn@4.12.0 --activate \
  && chmod -R a+rX "$COREPACK_HOME" \
  && echo "node ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/node \
  && chmod 0440 /etc/sudoers.d/node \
  && git config --system --add safe.directory /workspace/cal.diy

RUN <<'EOF'
set -eu
cat > /usr/local/bin/journal-start-calcom <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/calendso}"
export DATABASE_DIRECT_URL="${DATABASE_DIRECT_URL:-$DATABASE_URL}"
export NEXT_PUBLIC_WEBAPP_URL="${NEXT_PUBLIC_WEBAPP_URL:-http://localhost:3000}"
export NEXTAUTH_URL="${NEXTAUTH_URL:-$NEXT_PUBLIC_WEBAPP_URL/api/auth}"
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-RbyBOfiZFt/IsBL2E2Zy2idcKRH+WclnHEiu1FmRdf0=}"
export CALENDSO_ENCRYPTION_KEY="${CALENDSO_ENCRYPTION_KEY:-Lmqy57DlHKPvwwrtkwjL/8QtxJWxC/OV}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export CALCOM_TELEMETRY_DISABLED="${CALCOM_TELEMETRY_DISABLED:-1}"
export NEXT_TELEMETRY_DISABLED="${NEXT_TELEMETRY_DISABLED:-1}"

uses_local_url() {
  [[ "$1" == *"localhost"* || "$1" == *"127.0.0.1"* ]]
}

wait_for_postgres() {
  for _ in $(seq 1 60); do
    if sudo -u postgres pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "Postgres did not become ready on 127.0.0.1:5432" >&2
  return 1
}

start_postgres() {
  sudo service postgresql start >/dev/null || sudo pg_ctlcluster 15 main start
  wait_for_postgres
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER postgres WITH PASSWORD 'postgres';" >/dev/null

  if ! sudo -u postgres psql -Atqc "SELECT 1 FROM pg_database WHERE datname = 'calendso';" | grep -q 1; then
    sudo -u postgres createdb calendso
  fi
}

wait_for_redis() {
  for _ in $(seq 1 30); do
    if redis-cli -h 127.0.0.1 -p 6379 ping >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "Redis did not become ready on 127.0.0.1:6379" >&2
  return 1
}

start_redis() {
  sudo service redis-server start >/dev/null || redis-server --daemonize yes --bind 127.0.0.1 --port 6379
  wait_for_redis
}

run_database_setup() {
  if [[ "${JOURNAL_SKIP_DB_SETUP:-0}" == "1" ]]; then
    return 0
  fi

  yarn workspace @calcom/prisma run db-deploy

  if [[ "${JOURNAL_SEED_DB:-0}" != "1" ]]; then
    return 0
  fi

  local user_count
  user_count="$(psql "$DATABASE_URL" -Atqc 'SELECT COUNT(*) FROM "users";' 2>/dev/null || true)"
  if [[ -z "$user_count" || "$user_count" == "0" ]]; then
    yarn workspace @calcom/prisma run db-seed
  fi
}

if uses_local_url "$DATABASE_URL"; then
  start_postgres
fi

if uses_local_url "$REDIS_URL"; then
  start_redis
fi

run_database_setup

yarn workspace @calcom/web run copy-app-store-static
exec yarn workspace @calcom/web run next dev --turbopack --hostname 0.0.0.0 --port "${PORT:-3000}"
SCRIPT
chmod +x /usr/local/bin/journal-start-calcom

cat > /usr/local/bin/journal-prepare-calcom-db <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/calendso}"
export DATABASE_DIRECT_URL="${DATABASE_DIRECT_URL:-$DATABASE_URL}"
export NEXT_PUBLIC_WEBAPP_URL="${NEXT_PUBLIC_WEBAPP_URL:-http://localhost:3000}"
export NEXTAUTH_URL="${NEXTAUTH_URL:-$NEXT_PUBLIC_WEBAPP_URL/api/auth}"
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-RbyBOfiZFt/IsBL2E2Zy2idcKRH+WclnHEiu1FmRdf0=}"
export CALENDSO_ENCRYPTION_KEY="${CALENDSO_ENCRYPTION_KEY:-Lmqy57DlHKPvwwrtkwjL/8QtxJWxC/OV}"
export CALCOM_TELEMETRY_DISABLED="${CALCOM_TELEMETRY_DISABLED:-1}"
export NEXT_TELEMETRY_DISABLED="${NEXT_TELEMETRY_DISABLED:-1}"

wait_for_postgres() {
  for _ in $(seq 1 60); do
    if sudo -u postgres pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "Postgres did not become ready on 127.0.0.1:5432" >&2
  return 1
}

sudo service postgresql start >/dev/null || sudo pg_ctlcluster 15 main start
wait_for_postgres
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER postgres WITH PASSWORD 'postgres';" >/dev/null

if ! sudo -u postgres psql -Atqc "SELECT 1 FROM pg_database WHERE datname = 'calendso';" | grep -q 1; then
  sudo -u postgres createdb calendso
fi

yarn workspace @calcom/prisma run db-deploy

if [[ "${JOURNAL_SEED_DB:-1}" == "1" ]]; then
  user_count="$(psql "$DATABASE_URL" -Atqc 'SELECT COUNT(*) FROM "users";' 2>/dev/null || true)"
  if [[ -z "$user_count" || "$user_count" == "0" ]]; then
    yarn workspace @calcom/prisma run db-seed
  fi
fi

sudo service postgresql stop >/dev/null || sudo pg_ctlcluster 15 main stop
SCRIPT
chmod +x /usr/local/bin/journal-prepare-calcom-db
EOF

WORKDIR /workspace/cal.diy
COPY . /workspace/cal.diy

RUN git config --unset-all http.https://github.com/.extraheader || true \
  && yarn config set httpTimeout 1200000 \
  && CI=true yarn install --immutable \
  && yarn cache clean --all \
  && rm -rf /tmp/xfs-* /root/.cache/node-gyp \
  && JOURNAL_SEED_DB=1 journal-prepare-calcom-db \
  && chown -R node:node /workspace/cal.diy

USER node
