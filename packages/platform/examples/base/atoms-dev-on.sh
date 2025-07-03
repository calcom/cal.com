#!/bin/bash

set -e

echo "📦 Packing @calcom/atoms into dev .tgz..."
yarn workspace @calcom/atoms pack-dev

echo "🔧 Switching @calcom/atoms to dev .tgz..."

# Detect platform for sed compatibility
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' 's|"@calcom/atoms": ".*"|"@calcom/atoms": "file:../../atoms/cal-atoms-dev.tgz"|' package.json
else
  sed -i 's|"@calcom/atoms": ".*"|"@calcom/atoms": "file:../../atoms/cal-atoms-dev.tgz"|' package.json
fi

yarn install

echo "✅ Local atoms .tgz linked. Ready for dev."
