-- This is an empty migration.

ALTER TABLE "Availability" RENAME COLUMN "startTime" to "old_startTime";
ALTER TABLE "Availability" RENAME COLUMN "endTime" to "old_endTime";
ALTER TABLE "Availability" ADD COLUMN "startTime" TIME;
ALTER TABLE "Availability" ADD COLUMN "endTime" TIME;

UPDATE "Availability" SET "startTime" = CAST(CONCAT(CAST(("old_startTime" / 60) AS text), ':00') AS time);
UPDATE "Availability" SET "endTime" = CAST(CONCAT(CAST(("old_endTime" / 60) AS text), ':00') AS time);

ALTER TABLE "Availability" DROP COLUMN "old_startTime";
ALTER TABLE "Availability" DROP COLUMN "old_endTime";
ALTER TABLE "Availability" ALTER COLUMN "startTime" SET NOT NULL;
ALTER TABLE "Availability" ALTER COLUMN "endTime" SET NOT NULL;