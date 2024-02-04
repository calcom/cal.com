#!/bin/bash
set -xeuf -o pipefail

cp .env.example .env

sed -i 's|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET='"$(openssl rand -base64 32)"'|g' .env
sed -i 's|CALENDSO_ENCRYPTION_KEY=.*|CALENDSO_ENCRYPTION_KEY='"$(openssl rand -base64 32)"'|g' .env
yarn

./deploy/codespaces/install.sh