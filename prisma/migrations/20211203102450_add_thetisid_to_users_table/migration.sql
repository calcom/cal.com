/*
  Warnings:

  - A unique constraint covering the columns `[thetisId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "thetisId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_thetisId_key" ON "users"("thetisId");
