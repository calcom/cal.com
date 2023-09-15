#!/usr/bin/env bash
# src/run-integration.sh

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🟡 -${DIR}"

source $DIR/setenv.sh
docker-compose -f "${DIR}/docker-compose.yml" up -d
echo '🟡 - Waiting for database to be ready...'
# DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres"

echo "🟡 -${DATABASE_URL}"

# $DIR/wait-for-it.sh "${DATABASE_URL}" -t 60 -- echo '🟢 - Database is ready!'
yarn prisma migrate dev
yarn prisma db seed
yarn prisma generate

echo ${DIR}/handleNewbooking.test.ts

yarn vitest "${DIR}"