#!/usr/bin/env bash
set -euo pipefail

VM_HOST="${VM_HOST:-158.160.42.20}"
VM_USER="${VM_USER:-yc-user}"
SSH_KEY_PATH="${SSH_KEY_PATH:-/tmp/calcom-deploy}"
IMAGE="${IMAGE:-calcom.docker.scarf.sh/calcom/cal.com:latest}"

get_env_value() {
  local key="$1"
  local value="${!key:-}"
  if [[ -n "$value" ]]; then
    printf "%s" "$value"
    return 0
  fi

  if [[ ! -f .env ]]; then
    return 1
  fi

  value=$(grep "^${key}=" .env | head -n1 | cut -d= -f2-)
  value=${value%\"}
  value=${value#\"}
  value=${value%\'}
  value=${value#\'}
  printf "%s" "$value"
}

DATABASE_URL_VALUE=$(get_env_value DATABASE_URL)
if [[ -z "$DATABASE_URL_VALUE" ]]; then
  echo "DATABASE_URL is required (set it in environment or .env)" >&2
  exit 1
fi

DATABASE_HOST_VALUE=$(get_env_value DATABASE_HOST)
if [[ -z "$DATABASE_HOST_VALUE" ]]; then
  DATABASE_HOST_VALUE=$(printf "%s" "$DATABASE_URL_VALUE" | sed -E 's#^[^@]*@([^/?]+).*$#\1#')
fi

NEXT_PUBLIC_WEBAPP_URL_VALUE=$(get_env_value NEXT_PUBLIC_WEBAPP_URL)
if [[ -z "$NEXT_PUBLIC_WEBAPP_URL_VALUE" ]]; then
  NEXT_PUBLIC_WEBAPP_URL_VALUE="http://${VM_HOST}:3000"
fi

NEXTAUTH_URL_VALUE=$(get_env_value NEXTAUTH_URL)
if [[ -z "$NEXTAUTH_URL_VALUE" ]]; then
  NEXTAUTH_URL_VALUE="$NEXT_PUBLIC_WEBAPP_URL_VALUE"
fi

NEXTAUTH_SECRET_VALUE=$(get_env_value NEXTAUTH_SECRET)
if [[ -z "$NEXTAUTH_SECRET_VALUE" ]]; then
  echo "NEXTAUTH_SECRET is required (set it in environment or .env)" >&2
  exit 1
fi

CALENDSO_ENCRYPTION_KEY_VALUE=$(get_env_value CALENDSO_ENCRYPTION_KEY)
if [[ -z "$CALENDSO_ENCRYPTION_KEY_VALUE" ]]; then
  echo "CALENDSO_ENCRYPTION_KEY is required (set it in environment or .env)" >&2
  exit 1
fi

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
