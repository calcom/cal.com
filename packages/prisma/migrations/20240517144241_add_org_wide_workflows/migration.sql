-- DropForeignKey
ALTER TABLE "WorkflowReminder" DROP CONSTRAINT "WorkflowReminder_workflowStepId_fkey";

-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "isActiveOnAll" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "WorkflowsOnTeams" (
    "id" SERIAL NOT NULL,
    "workflowId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,

    CONSTRAINT "WorkflowsOnTeams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkflowsOnTeams_workflowId_idx" ON "WorkflowsOnTeams"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowsOnTeams_teamId_idx" ON "WorkflowsOnTeams"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowsOnTeams_workflowId_teamId_key" ON "WorkflowsOnTeams"("workflowId", "teamId");

-- AddForeignKey
ALTER TABLE "WorkflowsOnTeams" ADD CONSTRAINT "WorkflowsOnTeams_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowsOnTeams" ADD CONSTRAINT "WorkflowsOnTeams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowReminder" ADD CONSTRAINT "WorkflowReminder_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
