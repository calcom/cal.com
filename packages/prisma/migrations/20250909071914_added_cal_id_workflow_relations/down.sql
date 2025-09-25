-- DropForeignKey
ALTER TABLE "CalIdWorkflowStep" DROP CONSTRAINT "CalIdWorkflowStep_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "CalIdWorkflow" DROP CONSTRAINT "CalIdWorkflow_userId_fkey";

-- DropForeignKey
ALTER TABLE "CalIdWorkflow" DROP CONSTRAINT "CalIdWorkflow_calIdTeamId_fkey";

-- DropForeignKey
ALTER TABLE "CalIdWorkflowsOnEventTypes" DROP CONSTRAINT "CalIdWorkflowsOnEventTypes_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "CalIdWorkflowsOnEventTypes" DROP CONSTRAINT "CalIdWorkflowsOnEventTypes_eventTypeId_fkey";

-- DropForeignKey
ALTER TABLE "CalIdWorkflowsOnTeams" DROP CONSTRAINT "CalIdWorkflowsOnTeams_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "CalIdWorkflowsOnTeams" DROP CONSTRAINT "CalIdWorkflowsOnTeams_calIdTeamId_fkey";

-- DropForeignKey
ALTER TABLE "CalIdWorkflowReminder" DROP CONSTRAINT "CalIdWorkflowReminder_bookingUid_fkey";

-- DropForeignKey
ALTER TABLE "CalIdWorkflowReminder" DROP CONSTRAINT "CalIdWorkflowReminder_workflowStepId_fkey";

-- DropForeignKey
ALTER TABLE "CalIdWorkflowReminder" DROP CONSTRAINT "CalIdWorkflowReminder_userId_fkey";

-- DropForeignKey
ALTER TABLE "CalIdWorkflowInsights" DROP CONSTRAINT "CalIdWorkflowInsights_eventTypeId_fkey";

-- DropForeignKey
ALTER TABLE "CalIdWorkflowInsights" DROP CONSTRAINT "CalIdWorkflowInsights_workflowId_fkey";

-- DropTable
DROP TABLE "CalIdWorkflowStep";

-- DropTable
DROP TABLE "CalIdWorkflow";

-- DropTable
DROP TABLE "CalIdWorkflowsOnEventTypes";

-- DropTable
DROP TABLE "CalIdWorkflowsOnTeams";

-- DropTable
DROP TABLE "CalIdWorkflowReminder";

-- DropTable
DROP TABLE "CalIdWorkflowInsights";

