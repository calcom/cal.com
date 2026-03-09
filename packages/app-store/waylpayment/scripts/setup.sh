#!/usr/bin/env bash
# =============================================================
# Wayl App — setup script
#
# Usage (run from the Cal.com monorepo root):
#   bash packages/app-store/waylpayment/scripts/setup.sh
# =============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/.."
CALCOM_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

echo ""
echo "==============================="
echo "  Wayl App Setup"
echo "==============================="
echo ""

# ── Verify we're in the Cal.com monorepo ─────────────────────
if [ ! -f "$CALCOM_ROOT/package.json" ]; then
  echo "ERROR: Could not find Cal.com root at $CALCOM_ROOT"
  echo "Make sure this app is placed at: packages/app-store/waylpayment/"
  exit 1
fi

# ── 1. Patch packages/app-store/index.ts ─────────────────────
INDEX_FILE="$CALCOM_ROOT/packages/app-store/index.ts"
if grep -q "waylpayment" "$INDEX_FILE"; then
  echo "✓ app-store/index.ts already has waylpayment export"
else
  echo 'export * as waylpayment from "./waylpayment";' >> "$INDEX_FILE"
  echo "✓ Added waylpayment export to app-store/index.ts"
fi

# ── 2. Regenerate app-store generated files ──────────────────
echo ""
echo "Building app-store (regenerating metadata and service files)..."
cd "$CALCOM_ROOT"
yarn app-store:build
echo "✓ Generated files updated"

# ── 3. Register app in the database ──────────────────────────
echo ""
if [ -z "$DATABASE_URL" ]; then
  echo "⚠ DATABASE_URL not set — skipping automatic DB seed."
  echo "  Run this manually:"
  echo "    psql \$DATABASE_URL -f $APP_DIR/scripts/db-seed.sql"
else
  echo "Seeding database..."
  psql --set=ON_ERROR_STOP=1 "$DATABASE_URL" -f "$APP_DIR/scripts/db-seed.sql"
  echo "✓ App registered in database"
fi

# ── Done ─────────────────────────────────────────────────────
echo ""
echo "==============================="
echo "  Setup complete!"
echo "==============================="
echo ""
echo "Next steps:"
echo "  1. Add to .env:  CALCOM_APP_CREDENTIAL_ENCRYPTION_KEY=\$(openssl rand -base64 32)"
echo "  2. Run: yarn app-store:watch   (in a separate terminal)"
echo "  3. Run: yarn dev"
echo "  4. Go to App Store → Wayl → Install → enter your Wayl Merchant Token"
echo ""
