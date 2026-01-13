/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "uuid" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "users_uuid_key" ON "public"."users"("uuid");

-- Backfill UUIDs in batches to avoid table locking on large datasets
-- Uses FOR UPDATE SKIP LOCKED to prevent blocking other transactions
-- Processes 1000 rows at a time with small delays between batches
DO $$
DECLARE
  batch_size INT := 1000;
  rows_updated INT;
  total_updated INT := 0;
BEGIN
  LOOP
    WITH batch AS (
      SELECT id
      FROM "public"."users"
      WHERE uuid IS NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "public"."users"
    SET uuid = gen_random_uuid()
    FROM batch
    WHERE "public"."users".id = batch.id;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    total_updated := total_updated + rows_updated;
    
    EXIT WHEN rows_updated = 0;
    
    PERFORM pg_sleep(0.01);
    
    IF total_updated % 10000 = 0 THEN
      RAISE NOTICE 'Updated % users with UUIDs', total_updated;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Completed: Updated % total users with UUIDs', total_updated;
END $$;
