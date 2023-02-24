/*
  Warnings:

  - A unique constraint covering the columns `[eventTypeId,slotUtcDate,ip]` on the table `SelectedSlots` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ip` to the `SelectedSlots` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "SelectedSlots_eventTypeId_slotUtcDate_key";

-- AlterTable
ALTER TABLE "SelectedSlots" ADD COLUMN     "ip" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SelectedSlots_eventTypeId_slotUtcDate_ip_key" ON "SelectedSlots"("eventTypeId", "slotUtcDate", "ip");
