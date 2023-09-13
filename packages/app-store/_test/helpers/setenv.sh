#!/usr/bin/env bash

# scripts/setenv.sh


# Export env vars

export $(grep -v '^#' .env | xargs)