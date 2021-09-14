#!/bin/sh
set -x
npx prisma db push
yarn start