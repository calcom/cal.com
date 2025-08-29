-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkflowTriggerEvents" ADD VALUE 'FORM_SUBMITTED';
ALTER TYPE "WorkflowTriggerEvents" ADD VALUE 'FORM_SUBMITTED_NO_EVENT';

-- CreateTable
CREATE TABLE "WorkflowsOnRoutingForms" (
    "id" SERIAL NOT NULL,
    "workflowId" INTEGER NOT NULL,
    "routingFormId" TEXT NOT NULL,

    CONSTRAINT "WorkflowsOnRoutingForms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkflowsOnRoutingForms_workflowId_idx" ON "WorkflowsOnRoutingForms"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowsOnRoutingForms_routingFormId_idx" ON "WorkflowsOnRoutingForms"("routingFormId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowsOnRoutingForms_workflowId_routingFormId_key" ON "WorkflowsOnRoutingForms"("workflowId", "routingFormId");

-- AddForeignKey
ALTER TABLE "WorkflowsOnRoutingForms" ADD CONSTRAINT "WorkflowsOnRoutingForms_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowsOnRoutingForms" ADD CONSTRAINT "WorkflowsOnRoutingForms_routingFormId_fkey" FOREIGN KEY ("routingFormId") REFERENCES "App_RoutingForms_Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
