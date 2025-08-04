#!/bin/bash

set -e

# Load environment variables
if [ ! -f .env ]; then
  echo "❌ .env file not found. Please create one."
  exit 1
fi

source .env

# Required variables
REQUIRED_VARS=("SSH_KEY_PATH" "SSH_USER" "SSH_HOST" "RDS_HOST" "LOCAL_PORT" "REMOTE_PORT")
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Required environment variable '$var' is not set. Please check your .env file."
    exit 1
  fi
done

# Check if autossh is installed
if ! command -v autossh >/dev/null 2>&1; then
  echo "❌ autossh is not installed. Install it and retry."
  exit 1
fi

# Start tunnel
echo "🚀 Starting SSH tunnel on port $LOCAL_PORT..."
autossh -M 0 -f -N \
  -i "$SSH_KEY_PATH" \
  -L "$LOCAL_PORT:$RDS_HOST:$REMOTE_PORT" \
  "$SSH_USER@$SSH_HOST"

if [ $? -ne 0 ]; then
  echo "❌ Failed to start SSH tunnel."
  exit 1
fi

# Start dev server
echo "🧪 Starting dev server..."
yarn workspace @calcom/web run dev
