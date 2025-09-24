/*
  Warnings:

  - A unique constraint covering the columns `[teamId,userId,isHeader]` on the table `avatars` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[teamId,userId,isFavicon]` on the table `avatars` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[teamId,userId,isBanner]` on the table `avatars` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "avatars_teamId_userId_isBanner_isFavicon_isHeader_key";

-- CreateIndex
CREATE UNIQUE INDEX "avatars_teamId_userId_isHeader_key" ON "avatars"("teamId", "userId", "isHeader");

-- CreateIndex
CREATE UNIQUE INDEX "avatars_teamId_userId_isFavicon_key" ON "avatars"("teamId", "userId", "isFavicon");

-- CreateIndex
CREATE UNIQUE INDEX "avatars_teamId_userId_isBanner_key" ON "avatars"("teamId", "userId", "isBanner");
