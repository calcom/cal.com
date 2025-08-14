-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "WorkflowInsights" (
    "msgId" TEXT NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "workflowId" INTEGER,
    "type" "WorkflowMethods" NOT NULL,
    "status" "WorkflowStatus" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowInsights_msgId_key" ON "WorkflowInsights"("msgId");

-- AddForeignKey
ALTER TABLE "WorkflowInsights" ADD CONSTRAINT "WorkflowInsights_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInsights" ADD CONSTRAINT "WorkflowInsights_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
