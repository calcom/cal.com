/*
  Warnings:

  - A unique constraint covering the columns `[movedToProfileId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "profileId" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "movedToProfileId" INTEGER;

-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Profile_uid_idx" ON "Profile"("uid");

-- CreateIndex
CREATE INDEX "Profile_userId_idx" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Profile_organizationId_idx" ON "Profile"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_organizationId_key" ON "Profile"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "users_movedToProfileId_key" ON "users"("movedToProfileId");

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_movedToProfileId_fkey" FOREIGN KEY ("movedToProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Copy Data to Profile table
WITH new_profile AS (
  INSERT INTO "Profile" ("uid", "organizationId", "userId", "username", "updatedAt")
  SELECT "id" as "uid", "organizationId", "id" AS "userId", "username",  NOW()
  FROM "users"
  WHERE "organizationId" IS NOT NULL
  RETURNING "uid", "userId", "id"
)
UPDATE "users"
SET "movedToProfileId" = "new_profile"."id"
FROM "new_profile"
WHERE "users"."id" = "new_profile"."userId";