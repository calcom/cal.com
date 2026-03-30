-- CreateEnum
CREATE TYPE "public"."WorkflowStepAutoTranslatedField" AS ENUM ('REMINDER_BODY', 'EMAIL_SUBJECT');

-- AlterTable
ALTER TABLE "public"."WorkflowStep" ADD COLUMN     "autoTranslateEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceLocale" TEXT;

-- CreateTable
CREATE TABLE "public"."WorkflowStepTranslation" (
    "uid" TEXT NOT NULL,
    "workflowStepId" INTEGER NOT NULL,
    "field" "public"."WorkflowStepAutoTranslatedField" NOT NULL,
    "sourceLocale" TEXT NOT NULL,
    "targetLocale" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStepTranslation_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStepTranslation_workflowStepId_field_targetLocale_key" ON "public"."WorkflowStepTranslation"("workflowStepId", "field", "targetLocale");

-- AddForeignKey
ALTER TABLE "public"."WorkflowStepTranslation" ADD CONSTRAINT "WorkflowStepTranslation_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "public"."WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
