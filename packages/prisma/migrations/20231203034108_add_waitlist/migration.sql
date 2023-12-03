/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Waitlist` table. All the data in the column will be lost.
  - Added the required column `eventDateTime` to the `Waitlist` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Waitlist" DROP CONSTRAINT "Waitlist_userId_fkey";

-- AlterTable
ALTER TABLE "Waitlist" DROP COLUMN "createdAt",
ADD COLUMN     "eventDateTime" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Waitlist_eventDateTime_idx" ON "Waitlist"("eventDateTime");

-- AddForeignKey
ALTER TABLE "Waitlist" ADD CONSTRAINT "Waitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
