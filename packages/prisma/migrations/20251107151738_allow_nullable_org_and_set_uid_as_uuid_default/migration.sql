/*
  Warnings:

  - A unique constraint covering the columns `[uid]` on the table `Profile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Profile" ALTER COLUMN "organizationId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Profile_uid_key" ON "public"."Profile"("uid");
