/*
  Warnings:

  - You are about to drop the column `smartContractAddress` on the `EventType` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EventType" DROP COLUMN "smartContractAddress",
ADD COLUMN     "metadata" JSONB;

-- RenameIndex
ALTER INDEX "DailyEventReference_bookingId_unique" RENAME TO "DailyEventReference_bookingId_key";
