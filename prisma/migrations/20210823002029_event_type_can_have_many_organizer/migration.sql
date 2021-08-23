/*
  Warnings:

  - You are about to drop the column `remainingSpots` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `EventType` table. All the data in the column will be lost.
  - Added the required column `schedulingType` to the `EventType` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SchedulingType" AS ENUM ('roundRobin', 'collective');

-- DropForeignKey
ALTER TABLE "EventType" DROP CONSTRAINT "EventType_userId_fkey";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "remainingSpots";

-- AlterTable
ALTER TABLE "EventType" DROP COLUMN "userId",
ADD COLUMN     "schedulingType" "SchedulingType" NOT NULL,
ADD COLUMN     "teamId" INTEGER;

-- CreateTable
CREATE TABLE "_EventTypeToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_EventTypeToUser_AB_unique" ON "_EventTypeToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_EventTypeToUser_B_index" ON "_EventTypeToUser"("B");

-- AddForeignKey
ALTER TABLE "EventType" ADD FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventTypeToUser" ADD FOREIGN KEY ("A") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventTypeToUser" ADD FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
