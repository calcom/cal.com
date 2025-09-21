-- DropForeignKey
ALTER TABLE "CalIdWorkflowReminder" DROP CONSTRAINT "CalIdWorkflowReminder_attendeeId_fkey";

-- DropIndex
DROP INDEX "VerificationToken_calIdTeamId_idx";

-- AlterTable
ALTER TABLE "CalIdWorkflowReminder" DROP COLUMN "attendeeId";

