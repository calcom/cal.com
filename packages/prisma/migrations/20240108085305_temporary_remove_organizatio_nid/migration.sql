/*
  Warnings:

  - You are about to drop the column `organizationId` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_organizationId_fkey";

-- DropIndex
DROP INDEX "users_username_organizationId_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "organizationId";

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
