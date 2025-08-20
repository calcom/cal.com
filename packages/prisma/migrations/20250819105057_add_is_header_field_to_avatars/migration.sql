/*
  Warnings:

  - A unique constraint covering the columns `[teamId,userId,isHeader]` on the table `avatars` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "avatars" ADD COLUMN     "isHeader" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "avatars_teamId_userId_isHeader_key" ON "avatars"("teamId", "userId", "isHeader");
