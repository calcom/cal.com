-- AlterTable
ALTER TABLE "CalIdWorkflowInsights" ADD COLUMN     "workflowStepId" INTEGER;

-- AddForeignKey
ALTER TABLE "CalIdWorkflowInsights" ADD CONSTRAINT "CalIdWorkflowInsights_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "CalIdWorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
