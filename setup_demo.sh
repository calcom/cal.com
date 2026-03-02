#!/bin/bash
# Demo setup script for local development only.
# NOT intended for production use.
set -e
echo "=== Cal.com Proton Calendar Demo Setup ==="

# 1. Start fresh postgres
docker rm -f mydb 2>/dev/null || true
docker run -d --name mydb \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  -e POSTGRES_DB=calendso \
  -p 5432:5432 postgres
echo "Waiting for postgres..."
sleep 8

# 2. Setup .env
cp .env.example .env
sed -i '/^NEXTAUTH_SECRET/d' .env
sed -i '/^CALENDSO_ENCRYPTION_KEY/d' .env
sed -i '/^DATABASE_URL/d' .env
sed -i '/^DATABASE_DIRECT_URL/d' .env
sed -i '/^NEXTAUTH_URL/d' .env
sed -i '/^NEXT_PUBLIC_WEBAPP_URL/d' .env
echo 'NEXTAUTH_SECRET=supersecret1234567890123456789012' >> .env
echo 'CALENDSO_ENCRYPTION_KEY=12345678901234567890123456789012' >> .env
echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/calendso"' >> .env
echo 'DATABASE_DIRECT_URL="postgresql://postgres:postgres@localhost:5432/calendso"' >> .env
# NEXTAUTH_URL must be the base URL without path (per .env.example guidance)
echo 'NEXTAUTH_URL="http://localhost:3000"' >> .env
echo 'NEXT_PUBLIC_WEBAPP_URL="http://localhost:3000"' >> .env

# 3. Install packages
echo "Installing packages..."
yarn install

# 4. Migrate and seed
echo "Setting up database..."
yarn prisma migrate deploy
yarn prisma db seed

# 5. Temporarily patch domain validation to allow localhost for local dev testing only.
# This patch is reverted automatically after the dev server exits.
PATCH_FILE="./packages/app-store/protoncalendar/api/add.ts"
BACKUP_FILE="${PATCH_FILE}.bak"

cp "$PATCH_FILE" "$BACKUP_FILE"

node -e "
const fs = require('fs');
const f = '$PATCH_FILE';
let c = fs.readFileSync(f, 'utf8');
c = c.replace(
  'if (parsedUrl.protocol !== \"https:\")',
  'if (parsedUrl.protocol !== \"https:\" && parsedUrl.protocol !== \"http:\")'
);
c = c.replace(
  'if (!isProtonDomain)',
  'if (!isProtonDomain && ![\"localhost\",\"127.0.0.1\"].includes(parsedUrl.hostname))'
);
fs.writeFileSync(f, c);
console.log('Patched add.ts for local dev (backup at add.ts.bak)');
"

# Ensure patch is reverted on exit
trap "cp '$BACKUP_FILE' '$PATCH_FILE' && rm -f '$BACKUP_FILE' && echo 'Reverted add.ts to original'" EXIT

# 6. Start ICS server in background (serves a demo busy slot for local testing)
node -e "
const h=require('http');
const ics='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:demo-busy-1\r\nDTSTAMP:20260302T000000Z\r\nDTSTART:20260302T083000Z\r\nDTEND:20260302T093000Z\r\nSUMMARY:Busy (Proton Calendar)\r\nTRANSP:OPAQUE\r\nEND:VEVENT\r\nEND:VCALENDAR';
h.createServer((_,r)=>{r.writeHead(200,{'Content-Type':'text/calendar','Access-Control-Allow-Origin':'*'});r.end(ics)}).listen(8080,()=>console.log('ICS server ready on :8080'));
" &

echo ""
echo "==================================================="
echo "Setup complete! Starting Cal.com dev server..."
echo "See packages/prisma/seed.ts for default credentials"
echo "ICS test URL: http://localhost:8080"
echo "==================================================="

# 7. Start dev server
NODE_OPTIONS="--max-old-space-size=6144" yarn workspace @calcom/web dev
