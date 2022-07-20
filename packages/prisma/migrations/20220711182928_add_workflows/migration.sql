-- CreateEnum
CREATE TYPE "WorkflowTriggerEvents" AS ENUM ('BEFORE_EVENT', 'EVENT_CANCELLED', 'NEW_EVENT');

-- CreateEnum
CREATE TYPE "WorkflowActions" AS ENUM ('EMAIL_HOST', 'EMAIL_ATTENDEE', 'SMS_ATTENDEE', 'SMS_NUMBER');

-- CreateEnum
CREATE TYPE "TimeUnit" AS ENUM ('day', 'hour', 'minute');

-- CreateEnum
CREATE TYPE "WorkflowTemplates" AS ENUM ('REMINDER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WorkflowMethods" AS ENUM ('EMAIL', 'SMS');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "smsReminderNumber" TEXT;

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" SERIAL NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "action" "WorkflowActions" NOT NULL,
    "workflowId" INTEGER NOT NULL,
    "sendTo" TEXT,
    "reminderBody" TEXT,
    "emailSubject" TEXT,
    "template" "WorkflowTemplates" NOT NULL DEFAULT E'REMINDER',

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "trigger" "WorkflowTriggerEvents" NOT NULL,
    "time" INTEGER,
    "timeUnit" "TimeUnit",

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowsOnEventTypes" (
    "id" SERIAL NOT NULL,
    "workflowId" INTEGER NOT NULL,
    "eventTypeId" INTEGER NOT NULL,

    CONSTRAINT "WorkflowsOnEventTypes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowReminder" (
    "id" SERIAL NOT NULL,
    "bookingUid" TEXT NOT NULL,
    "method" "WorkflowMethods" NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "referenceId" TEXT,
    "scheduled" BOOLEAN NOT NULL,
    "workflowStepId" INTEGER NOT NULL,

    CONSTRAINT "WorkflowReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowReminder_referenceId_key" ON "WorkflowReminder"("referenceId");

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowsOnEventTypes" ADD CONSTRAINT "WorkflowsOnEventTypes_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowsOnEventTypes" ADD CONSTRAINT "WorkflowsOnEventTypes_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowReminder" ADD CONSTRAINT "WorkflowReminder_bookingUid_fkey" FOREIGN KEY ("bookingUid") REFERENCES "Booking"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowReminder" ADD CONSTRAINT "WorkflowReminder_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
