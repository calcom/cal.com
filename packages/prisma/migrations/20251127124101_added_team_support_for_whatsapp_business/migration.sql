/*
  Warnings:

  - Added the required column `calIdTeamId` to the `WhatsAppBusinessPhone` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "WorkflowStatus" ADD VALUE 'QUEUED';

-- DropIndex
DROP INDEX "WhatsAppBusinessPhone_credentialId_key";

-- DropIndex
DROP INDEX "WhatsAppBusinessPhone_userId_key";

-- AlterTable
ALTER TABLE "WhatsAppBusinessPhone" ADD COLUMN     "calIdTeamId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "WhatsAppBusinessPhone" ADD CONSTRAINT "WhatsAppBusinessPhone_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
