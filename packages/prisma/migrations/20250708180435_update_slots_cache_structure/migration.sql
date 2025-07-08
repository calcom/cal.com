/*
  Warnings:

  - You are about to drop the column `slotTime` on the `SlotsCache` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[eventTypeId,slotStartTime,slotLength]` on the table `SlotsCache` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slotEndTime` to the `SlotsCache` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slotLength` to the `SlotsCache` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slotStartTime` to the `SlotsCache` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "SlotsCache_eventTypeId_slotTime_key";

-- AlterTable
ALTER TABLE "SlotsCache" DROP COLUMN "slotTime",
ADD COLUMN     "slotEndTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "slotLength" INTEGER NOT NULL,
ADD COLUMN     "slotStartTime" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "SlotsCache_eventTypeId_slotLength_idx" ON "SlotsCache"("eventTypeId", "slotLength");

-- CreateIndex
CREATE UNIQUE INDEX "SlotsCache_eventTypeId_slotStartTime_slotLength_key" ON "SlotsCache"("eventTypeId", "slotStartTime", "slotLength");
