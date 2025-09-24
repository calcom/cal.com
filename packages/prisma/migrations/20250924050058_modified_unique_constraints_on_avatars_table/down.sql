-- DropIndex
DROP INDEX "avatars_teamId_userId_isHeader_key";

-- DropIndex
DROP INDEX "avatars_teamId_userId_isFavicon_key";

-- DropIndex
DROP INDEX "avatars_teamId_userId_isBanner_key";

-- CreateIndex
CREATE UNIQUE INDEX "avatars_teamId_userId_isBanner_isFavicon_isHeader_key" ON "avatars"("teamId" ASC, "userId" ASC, "isBanner" ASC, "isFavicon" ASC, "isHeader" ASC);

