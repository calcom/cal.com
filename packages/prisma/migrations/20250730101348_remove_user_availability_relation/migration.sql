/*
  Warnings:

  - You are about to drop the column `userId` on the `Availability` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Availability" DROP CONSTRAINT "Availability_userId_fkey";

-- DropIndex
DROP INDEX "Availability_userId_idx";

-- AlterTable
ALTER TABLE "Availability" DROP COLUMN "userId";
