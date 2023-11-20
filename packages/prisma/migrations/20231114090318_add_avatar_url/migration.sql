-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarUrl" TEXT;

-- CreateTable
CREATE TABLE "avatars" (
    "teamId" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "data" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "avatars_objectKey_key" ON "avatars"("objectKey");

-- CreateIndex
CREATE UNIQUE INDEX "avatars_teamId_userId_key" ON "avatars"("teamId", "userId");
