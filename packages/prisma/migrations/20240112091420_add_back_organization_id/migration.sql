/*
  Warnings:

  - A unique constraint covering the columns `[username,organizationId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "users_username_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "organizationId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_organizationId_key" ON "users"("username", "organizationId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
