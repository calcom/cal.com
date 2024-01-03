/*
  Warnings:

  - You are about to drop the `OrgProfile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrgProfile" DROP CONSTRAINT "OrgProfile_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "OrgProfile" DROP CONSTRAINT "OrgProfile_userId_fkey";

-- DropIndex
DROP INDEX "users_username_idx";

-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "ownedByOrganizationId" INTEGER;

-- DropTable
DROP TABLE "OrgProfile";

-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "away" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Profile_userId_idx" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Profile_organizationId_idx" ON "Profile"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_organizationId_key" ON "Profile"("userId", "organizationId");

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_ownedByOrganizationId_fkey" FOREIGN KEY ("ownedByOrganizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
