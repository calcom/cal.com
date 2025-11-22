-- Add Given/Last name columns and backfill from existing name data
ALTER TABLE "users"
  ADD COLUMN "givenName" TEXT NOT NULL DEFAULT '';

ALTER TABLE "users"
  ADD COLUMN "lastName" TEXT;

-- Backfill using the first whitespace split for legacy data
UPDATE "users"
SET
  "givenName" = CASE
    WHEN "name" IS NULL OR btrim("name") = '' THEN ''
    WHEN strpos(btrim("name"), ' ') = 0 THEN btrim("name")
    ELSE split_part(btrim("name"), ' ', 1)
  END,
  "lastName" = CASE
    WHEN "name" IS NULL OR btrim("name") = '' THEN NULL
    WHEN strpos(btrim("name"), ' ') = 0 THEN NULL
    ELSE btrim(substr(btrim("name"), strpos(btrim("name"), ' ') + 1))
  END;

-- Keep legacy name column consistent with the new fields
UPDATE "users"
SET "name" = btrim(concat_ws(' ', NULLIF("givenName", ''), NULLIF("lastName", '')))
WHERE "name" IS DISTINCT FROM btrim(concat_ws(' ', NULLIF("givenName", ''), NULLIF("lastName", '')));
