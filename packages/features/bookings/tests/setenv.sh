#!/usr/bin/env bash
# scripts/setenv.sh

# Export env vars
export $(grep -v '^#' .env | xargs)
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres"