/*
  Warnings:

  - You are about to drop the column `credentialId` on the `CalendarSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `delegationCredentialId` on the `CalendarSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `externalId` on the `CalendarSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `integration` on the `CalendarSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `CalendarSubscription` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[selectedCalendarId]` on the table `CalendarSubscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `selectedCalendarId` to the `CalendarSubscription` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CalendarSubscription" DROP CONSTRAINT "CalendarSubscription_credentialId_fkey";

-- DropForeignKey
ALTER TABLE "CalendarSubscription" DROP CONSTRAINT "CalendarSubscription_delegationCredentialId_fkey";

-- DropForeignKey
ALTER TABLE "CalendarSubscription" DROP CONSTRAINT "CalendarSubscription_userId_fkey";

-- DropIndex
DROP INDEX "CalendarSubscription_userId_integration_externalId_key";

-- DropIndex
DROP INDEX "CalendarSubscription_userId_integration_idx";

-- AlterTable
ALTER TABLE "CalendarSubscription" DROP COLUMN "credentialId",
DROP COLUMN "delegationCredentialId",
DROP COLUMN "externalId",
DROP COLUMN "integration",
DROP COLUMN "userId",
ADD COLUMN     "selectedCalendarId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSubscription_selectedCalendarId_key" ON "CalendarSubscription"("selectedCalendarId");

-- CreateIndex
CREATE INDEX "CalendarSubscription_selectedCalendarId_idx" ON "CalendarSubscription"("selectedCalendarId");

-- AddForeignKey
ALTER TABLE "CalendarSubscription" ADD CONSTRAINT "CalendarSubscription_selectedCalendarId_fkey" FOREIGN KEY ("selectedCalendarId") REFERENCES "SelectedCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
