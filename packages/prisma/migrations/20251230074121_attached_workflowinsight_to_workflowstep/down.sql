-- DropForeignKey
ALTER TABLE "CalIdWorkflowInsights" DROP CONSTRAINT "CalIdWorkflowInsights_workflowStepId_fkey";

-- AlterTable
ALTER TABLE "CalIdWorkflowInsights" DROP COLUMN "workflowStepId";

