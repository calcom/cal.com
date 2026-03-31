/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `EventType` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."EventType" ADD COLUMN     "uuid" UUID DEFAULT uuidv7();

-- Backfill existing rows in batches of 10,000 to avoid long locks
DO $$
DECLARE
  batch_size INT := 10000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE "public"."EventType"
    SET "uuid" = uuidv7()
    WHERE "id" IN (
      SELECT "id" FROM "public"."EventType"
      WHERE "uuid" IS NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;

-- Note: unique index must be created manually with CONCURRENTLY after backfill completes:
-- CREATE UNIQUE INDEX CONCURRENTLY "EventType_uuid_key" ON "public"."EventType"("uuid");
-- Then a follow-up migration will make the column required and declare the index in schema.
