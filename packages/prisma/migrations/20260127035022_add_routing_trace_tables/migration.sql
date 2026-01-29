-- CreateTable
CREATE TABLE "public"."PendingRoutingTrace" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trace" JSONB NOT NULL,
    "formResponseId" INTEGER,
    "queuedFormResponseId" TEXT,

    CONSTRAINT "PendingRoutingTrace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoutingTrace" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trace" JSONB NOT NULL,
    "formResponseId" INTEGER,
    "queuedFormResponseId" TEXT,
    "bookingUid" TEXT,
    "assignmentReasonId" INTEGER,

    CONSTRAINT "RoutingTrace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingRoutingTrace_formResponseId_key" ON "public"."PendingRoutingTrace"("formResponseId");

-- CreateIndex
CREATE UNIQUE INDEX "PendingRoutingTrace_queuedFormResponseId_key" ON "public"."PendingRoutingTrace"("queuedFormResponseId");

-- CreateIndex
CREATE UNIQUE INDEX "RoutingTrace_formResponseId_key" ON "public"."RoutingTrace"("formResponseId");

-- CreateIndex
CREATE UNIQUE INDEX "RoutingTrace_queuedFormResponseId_key" ON "public"."RoutingTrace"("queuedFormResponseId");

-- CreateIndex
CREATE UNIQUE INDEX "RoutingTrace_bookingUid_key" ON "public"."RoutingTrace"("bookingUid");

-- CreateIndex
CREATE UNIQUE INDEX "RoutingTrace_assignmentReasonId_key" ON "public"."RoutingTrace"("assignmentReasonId");

-- AddForeignKey
ALTER TABLE "public"."PendingRoutingTrace" ADD CONSTRAINT "PendingRoutingTrace_formResponseId_fkey" FOREIGN KEY ("formResponseId") REFERENCES "public"."App_RoutingForms_FormResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PendingRoutingTrace" ADD CONSTRAINT "PendingRoutingTrace_queuedFormResponseId_fkey" FOREIGN KEY ("queuedFormResponseId") REFERENCES "public"."App_RoutingForms_QueuedFormResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoutingTrace" ADD CONSTRAINT "RoutingTrace_formResponseId_fkey" FOREIGN KEY ("formResponseId") REFERENCES "public"."App_RoutingForms_FormResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoutingTrace" ADD CONSTRAINT "RoutingTrace_queuedFormResponseId_fkey" FOREIGN KEY ("queuedFormResponseId") REFERENCES "public"."App_RoutingForms_QueuedFormResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoutingTrace" ADD CONSTRAINT "RoutingTrace_bookingUid_fkey" FOREIGN KEY ("bookingUid") REFERENCES "public"."Booking"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoutingTrace" ADD CONSTRAINT "RoutingTrace_assignmentReasonId_fkey" FOREIGN KEY ("assignmentReasonId") REFERENCES "public"."AssignmentReason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint: Ensure at least one of formResponseId or queuedFormResponseId is set
ALTER TABLE "public"."PendingRoutingTrace" ADD CONSTRAINT "PendingRoutingTrace_at_least_one_response_id" CHECK ("formResponseId" IS NOT NULL OR "queuedFormResponseId" IS NOT NULL);

-- AddCheckConstraint: Ensure at least one of formResponseId or queuedFormResponseId is set
ALTER TABLE "public"."RoutingTrace" ADD CONSTRAINT "RoutingTrace_at_least_one_response_id" CHECK ("formResponseId" IS NOT NULL OR "queuedFormResponseId" IS NOT NULL);
