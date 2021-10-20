/*
  Warnings:

  - Made the column `username` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

-- RenameIndex
ALTER INDEX "DailyEventReference_bookingId_unique" RENAME TO "DailyEventReference.bookingId_unique";
