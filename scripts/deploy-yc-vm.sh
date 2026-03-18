#!/usr/bin/env bash
set -euo pipefail

VM_HOST="${VM_HOST:-158.160.42.20}"
VM_USER="${VM_USER:-yc-user}"
SSH_KEY_PATH="${SSH_KEY_PATH:-/tmp/calcom-deploy}"
IMAGE="${IMAGE:-calcom.docker.scarf.sh/calcom/cal.com:latest}"

DATABASE_URL_VALUE='postgresql://neondb_owner:npg_D2ETKr4UFSZh@ep-soft-violet-alhebtnu.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
DATABASE_HOST_VALUE='ep-soft-violet-alhebtnu.c-3.eu-central-1.aws.neon.tech:5432'
NEXT_PUBLIC_WEBAPP_URL_VALUE='http://158.160.42.20:3000'
NEXTAUTH_URL_VALUE='http://158.160.42.20:3000'

NEXTAUTH_SECRET_VALUE=$(grep '^NEXTAUTH_SECRET=' .env | head -n1 | cut -d= -f2-)
NEXTAUTH_SECRET_VALUE=${NEXTAUTH_SECRET_VALUE%\"}
NEXTAUTH_SECRET_VALUE=${NEXTAUTH_SECRET_VALUE#\"}
NEXTAUTH_SECRET_VALUE=${NEXTAUTH_SECRET_VALUE%\'}
NEXTAUTH_SECRET_VALUE=${NEXTAUTH_SECRET_VALUE#\'}

CALENDSO_ENCRYPTION_KEY_VALUE=$(grep '^CALENDSO_ENCRYPTION_KEY=' .env | head -n1 | cut -d= -f2-)
CALENDSO_ENCRYPTION_KEY_VALUE=${CALENDSO_ENCRYPTION_KEY_VALUE%\"}
CALENDSO_ENCRYPTION_KEY_VALUE=${CALENDSO_ENCRYPTION_KEY_VALUE#\"}
CALENDSO_ENCRYPTION_KEY_VALUE=${CALENDSO_ENCRYPTION_KEY_VALUE%\'}
CALENDSO_ENCRYPTION_KEY_VALUE=${CALENDSO_ENCRYPTION_KEY_VALUE#\'}

ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" "$VM_USER@$VM_HOST" bash <<EOF
set -euo pipefail
sudo docker rm -f calcom >/dev/null 2>&1 || true
sudo docker pull "$IMAGE"
sudo docker run -d \
  --name calcom \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="$DATABASE_URL_VALUE" \
  -e DATABASE_DIRECT_URL="$DATABASE_URL_VALUE" \
  -e DATABASE_HOST="$DATABASE_HOST_VALUE" \
  -e NEXTAUTH_SECRET="$NEXTAUTH_SECRET_VALUE" \
  -e CALENDSO_ENCRYPTION_KEY="$CALENDSO_ENCRYPTION_KEY_VALUE" \
  -e NEXT_PUBLIC_WEBAPP_URL="$NEXT_PUBLIC_WEBAPP_URL_VALUE" \
  -e NEXTAUTH_URL="$NEXTAUTH_URL_VALUE" \
  "$IMAGE"
sleep 10
sudo docker ps --filter name=calcom
EOF

echo "Deployment command completed"
