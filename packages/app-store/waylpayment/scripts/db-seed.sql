-- ============================================================
-- Wayl App Registration — run this against your Cal.com database
-- ============================================================
-- This inserts the Wayl app record into the App table.
-- Cal.com uses this record to display the app in the store
-- and to look up app metadata when saving credentials.
-- ============================================================

INSERT INTO "App" (
  slug,
  "dirName",
  categories,
  keys,
  enabled,
  "createdAt",
  "updatedAt"
)
VALUES (
  'waylpayment',
  'waylpayment',
  ARRAY['payment']::"AppCategories"[],
  '{}',
  true,
  (NOW() AT TIME ZONE 'UTC'),
  (NOW() AT TIME ZONE 'UTC')
)
ON CONFLICT (slug) DO UPDATE SET
  "dirName"   = EXCLUDED."dirName",
  categories  = EXCLUDED.categories,
  -- Do NOT override enabled: preserves intentional manual disablement
  "updatedAt" = (NOW() AT TIME ZONE 'UTC');
