/*
  Warnings:

  - You are about to drop the column `Company` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EventType" ALTER COLUMN "disableGuests" SET DEFAULT false;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "Company",
ADD COLUMN     "company" TEXT;
