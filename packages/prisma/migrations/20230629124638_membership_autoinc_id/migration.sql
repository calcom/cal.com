/*
  Warnings:

  - The primary key for the `Membership` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[userId,teamId]` on the table `Membership` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Membership_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_teamId_key" ON "Membership"("userId", "teamId");
