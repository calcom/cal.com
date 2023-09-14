/*
  Warnings:

  - A unique constraint covering the columns `[teamId]` on the table `VerificationToken` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "VerificationToken" ADD COLUMN     "expiresInDays" INTEGER,
ADD COLUMN     "teamId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_teamId_key" ON "VerificationToken"("teamId");

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
