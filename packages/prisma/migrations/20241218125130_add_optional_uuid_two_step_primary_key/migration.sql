-- AlterTable
ALTER TABLE "SelectedCalendar" ADD COLUMN     "id" TEXT;

-- Update all historical rows (id) to `gen_random_uuid`
UPDATE "SelectedCalendar" SET "id" = gen_random_uuid() WHERE "id" IS NULL;