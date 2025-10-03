-- CreateTable
CREATE TABLE "CalIdWorkflowStep" (
    "id" SERIAL NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "action" "WorkflowActions" NOT NULL,
    "workflowId" INTEGER NOT NULL,
    "sendTo" TEXT,
    "reminderBody" TEXT,
    "emailSubject" TEXT,
    "template" "WorkflowTemplates" NOT NULL DEFAULT 'REMINDER',
    "numberRequired" BOOLEAN,
    "sender" TEXT,
    "numberVerificationPending" BOOLEAN NOT NULL DEFAULT true,
    "includeCalendarEvent" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "CalIdWorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalIdWorkflow" (
    "id" SERIAL NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "userId" INTEGER,
    "calIdTeamId" INTEGER,
    "isActiveOnAll" BOOLEAN NOT NULL DEFAULT false,
    "trigger" "WorkflowTriggerEvents" NOT NULL,
    "time" INTEGER,
    "timeUnit" "TimeUnit",
    "disabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CalIdWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalIdWorkflowsOnEventTypes" (
    "id" SERIAL NOT NULL,
    "workflowId" INTEGER NOT NULL,
    "eventTypeId" INTEGER NOT NULL,

    CONSTRAINT "CalIdWorkflowsOnEventTypes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalIdWorkflowsOnTeams" (
    "id" SERIAL NOT NULL,
    "workflowId" INTEGER NOT NULL,
    "calIdTeamId" INTEGER NOT NULL,

    CONSTRAINT "CalIdWorkflowsOnTeams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalIdWorkflowReminder" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT,
    "bookingUid" TEXT,
    "method" "WorkflowMethods" NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "referenceId" TEXT,
    "scheduled" BOOLEAN NOT NULL,
    "workflowStepId" INTEGER,
    "cancelled" BOOLEAN,
    "seatReferenceId" TEXT,
    "isMandatoryReminder" BOOLEAN DEFAULT false,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER,

    CONSTRAINT "CalIdWorkflowReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalIdWorkflowInsights" (
    "msgId" TEXT NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "workflowId" INTEGER,
    "type" "WorkflowMethods" NOT NULL,
    "status" "WorkflowStatus" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "CalIdWorkflowStep_workflowId_idx" ON "CalIdWorkflowStep"("workflowId");

-- CreateIndex
CREATE INDEX "CalIdWorkflow_userId_idx" ON "CalIdWorkflow"("userId");

-- CreateIndex
CREATE INDEX "CalIdWorkflow_calIdTeamId_idx" ON "CalIdWorkflow"("calIdTeamId");

-- CreateIndex
CREATE INDEX "CalIdWorkflowsOnEventTypes_workflowId_idx" ON "CalIdWorkflowsOnEventTypes"("workflowId");

-- CreateIndex
CREATE INDEX "CalIdWorkflowsOnEventTypes_eventTypeId_idx" ON "CalIdWorkflowsOnEventTypes"("eventTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "CalIdWorkflowsOnEventTypes_workflowId_eventTypeId_key" ON "CalIdWorkflowsOnEventTypes"("workflowId", "eventTypeId");

-- CreateIndex
CREATE INDEX "CalIdWorkflowsOnTeams_workflowId_idx" ON "CalIdWorkflowsOnTeams"("workflowId");

-- CreateIndex
CREATE INDEX "CalIdWorkflowsOnTeams_calIdTeamId_idx" ON "CalIdWorkflowsOnTeams"("calIdTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "CalIdWorkflowsOnTeams_workflowId_calIdTeamId_key" ON "CalIdWorkflowsOnTeams"("workflowId", "calIdTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "CalIdWorkflowReminder_uuid_key" ON "CalIdWorkflowReminder"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "CalIdWorkflowReminder_referenceId_key" ON "CalIdWorkflowReminder"("referenceId");

-- CreateIndex
CREATE INDEX "CalIdWorkflowReminder_bookingUid_idx" ON "CalIdWorkflowReminder"("bookingUid");

-- CreateIndex
CREATE INDEX "CalIdWorkflowReminder_workflowStepId_idx" ON "CalIdWorkflowReminder"("workflowStepId");

-- CreateIndex
CREATE INDEX "CalIdWorkflowReminder_seatReferenceId_idx" ON "CalIdWorkflowReminder"("seatReferenceId");

-- CreateIndex
CREATE INDEX "CalIdWorkflowReminder_method_scheduled_scheduledDate_idx" ON "CalIdWorkflowReminder"("method", "scheduled", "scheduledDate");

-- CreateIndex
CREATE INDEX "CalIdWorkflowReminder_cancelled_scheduledDate_idx" ON "CalIdWorkflowReminder"("cancelled", "scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "CalIdWorkflowInsights_msgId_key" ON "CalIdWorkflowInsights"("msgId");

-- AddForeignKey
ALTER TABLE "CalIdWorkflowStep" ADD CONSTRAINT "CalIdWorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "CalIdWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdWorkflow" ADD CONSTRAINT "CalIdWorkflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdWorkflow" ADD CONSTRAINT "CalIdWorkflow_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdWorkflowsOnEventTypes" ADD CONSTRAINT "CalIdWorkflowsOnEventTypes_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "CalIdWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdWorkflowsOnEventTypes" ADD CONSTRAINT "CalIdWorkflowsOnEventTypes_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdWorkflowsOnTeams" ADD CONSTRAINT "CalIdWorkflowsOnTeams_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "CalIdWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdWorkflowsOnTeams" ADD CONSTRAINT "CalIdWorkflowsOnTeams_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdWorkflowReminder" ADD CONSTRAINT "CalIdWorkflowReminder_bookingUid_fkey" FOREIGN KEY ("bookingUid") REFERENCES "Booking"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdWorkflowReminder" ADD CONSTRAINT "CalIdWorkflowReminder_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "CalIdWorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdWorkflowReminder" ADD CONSTRAINT "CalIdWorkflowReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdWorkflowInsights" ADD CONSTRAINT "CalIdWorkflowInsights_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdWorkflowInsights" ADD CONSTRAINT "CalIdWorkflowInsights_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "CalIdWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
