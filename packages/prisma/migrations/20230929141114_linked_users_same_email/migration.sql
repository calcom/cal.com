/*
  Warnings:

  - A unique constraint covering the columns `[email,organizationId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "users_email_key";

-- DropIndex
DROP INDEX "users_email_username_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "linkedByUserId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_organizationId_key" ON "users"("email", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_organizationId_key_null" ON "users"("email", ("organizationId" IS NULL)) WHERE "organizationId" IS NULL;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_linkedByUserId_fkey" FOREIGN KEY ("linkedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
