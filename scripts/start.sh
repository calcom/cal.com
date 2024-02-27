#!/bin/sh
set -x

npx prisma migrate deploy --schema ./packages/prisma/schema.prisma
npx ts-node --transpile-only ./packages/prisma/seed-app-store.ts
yarn start