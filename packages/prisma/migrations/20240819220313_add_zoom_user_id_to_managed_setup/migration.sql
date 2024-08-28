/*
  Warnings:

  - A unique constraint covering the columns `[zoomUserId]` on the table `ZohoSchedulingSetup` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `zoomUserId` to the `ZohoSchedulingSetup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ZohoSchedulingSetup" ADD COLUMN     "zoomUserId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ZohoSchedulingSetup_zoomUserId_key" ON "ZohoSchedulingSetup"("zoomUserId");
