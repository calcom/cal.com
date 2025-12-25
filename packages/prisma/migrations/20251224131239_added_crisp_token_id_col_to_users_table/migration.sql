/*
  Warnings:

  - A unique constraint covering the columns `[crispTokenId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "crispTokenId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_crispTokenId_key" ON "users"("crispTokenId");
