/*
  Warnings:

  - You are about to drop the column `originalBookingId` on the `Booking` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_originalBookingId_fkey";

-- DropIndex
DROP INDEX "public"."Booking_originalBookingId_idx";

-- AlterTable: Add new column
ALTER TABLE "public"."Booking" ADD COLUMN "originalBookingUid" TEXT;

-- Migrate data: Convert originalBookingId to originalBookingUid by looking up the uid
UPDATE "public"."Booking" AS b1
SET "originalBookingUid" = b2."uid"
FROM "public"."Booking" AS b2
WHERE b1."originalBookingId" = b2."id" AND b1."originalBookingId" IS NOT NULL;

-- AlterTable: Drop old column
ALTER TABLE "public"."Booking" DROP COLUMN "originalBookingId";

-- CreateIndex
CREATE INDEX "Booking_originalBookingUid_idx" ON "public"."Booking"("originalBookingUid");
