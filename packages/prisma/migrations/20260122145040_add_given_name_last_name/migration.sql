-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "firstName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lastName" TEXT;

-- Backfill existing users: split name into firstName and lastName
-- firstName = first word of name, lastName = remaining words
UPDATE "public"."users"
SET 
  "firstName" = COALESCE(SPLIT_PART(TRIM("name"), ' ', 1), ''),
  "lastName" = CASE 
    WHEN POSITION(' ' IN TRIM(COALESCE("name", ''))) > 0 
    THEN TRIM(SUBSTRING(TRIM("name") FROM POSITION(' ' IN TRIM("name")) + 1))
    ELSE NULL 
  END
WHERE "name" IS NOT NULL AND TRIM("name") != '';
