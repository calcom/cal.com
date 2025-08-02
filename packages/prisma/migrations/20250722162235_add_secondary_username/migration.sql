/*
  Warnings:

  - You are about to drop the column `createdAt` on the `SecondaryEmail` table. All the data in the column will be lost.
  - You are about to drop the column `emailPrimary` on the `SecondaryEmail` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `SecondaryEmail` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SecondaryEmail" DROP COLUMN "createdAt",
DROP COLUMN "emailPrimary";

-- CreateIndex
CREATE INDEX "SecondaryEmail_userId_idx" ON "SecondaryEmail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SecondaryEmail_email_key" ON "SecondaryEmail"("email");
