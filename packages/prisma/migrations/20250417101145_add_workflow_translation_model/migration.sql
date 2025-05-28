-- CreateEnum
CREATE TYPE "WorkflowStepTranslatedField" AS ENUM ('WORKFLOW_SUBJECT', 'WORKFLOW_BODY');

-- CreateTable
CREATE TABLE "WorkflowStepTranslation" (
    "uid" TEXT NOT NULL,
    "workflowStepId" INTEGER NOT NULL,
    "field" "WorkflowStepTranslatedField" NOT NULL,
    "sourceLocale" TEXT NOT NULL,
    "targetLocale" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "WorkflowStepTranslation_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE INDEX "WorkflowStepTranslation_workflowStepId_field_targetLocale_idx" ON "WorkflowStepTranslation"("workflowStepId", "field", "targetLocale");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStepTranslation_workflowStepId_field_targetLocale_key" ON "WorkflowStepTranslation"("workflowStepId", "field", "targetLocale");

-- AddForeignKey
ALTER TABLE "WorkflowStepTranslation" ADD CONSTRAINT "WorkflowStepTranslation_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStepTranslation" ADD CONSTRAINT "WorkflowStepTranslation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStepTranslation" ADD CONSTRAINT "WorkflowStepTranslation_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
