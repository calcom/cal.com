-- DropForeignKey
ALTER TABLE "WorkflowReminder" DROP CONSTRAINT "WorkflowReminder_attendeeId_fkey";

-- AlterTable
ALTER TABLE "WorkflowReminder" DROP COLUMN "attendeeId";

