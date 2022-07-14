/* Adding the new column where we are moving existing data from other columns to */
ALTER TABLE "EventType" ADD COLUMN "paymentConfig" jsonb;

/* Set the new JSON column with existing data from other columns */
UPDATE "EventType"
  SET "paymentConfig" = (
    SELECT to_json(
      (SELECT d FROM (SELECT price, currency WHERE price != 0) d))
    AS paymentConfig
  );

/* Now that we migrated the existing information, drop unused columns */
ALTER TABLE "EventType"
  DROP COLUMN "currency",
  DROP COLUMN "price";
