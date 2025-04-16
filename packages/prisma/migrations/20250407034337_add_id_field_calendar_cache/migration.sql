-- AlterTable
ALTER TABLE "CalendarCache" ADD COLUMN     "id" TEXT;

-- Update all historical rows (id) to `gen_random_uuid`
UPDATE "CalendarCache" SET "id" = gen_random_uuid() WHERE "id" IS NULL;