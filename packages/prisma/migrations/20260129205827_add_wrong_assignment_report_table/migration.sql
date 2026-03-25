-- CreateEnum
CREATE TYPE "public"."WrongAssignmentReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "public"."WrongAssignmentReport" (
    "id" UUID NOT NULL,
    "bookingUid" TEXT NOT NULL,
    "reportedById" INTEGER,
    "correctAssignee" TEXT,
    "additionalNotes" TEXT NOT NULL,
    "teamId" INTEGER,
    "routingFormId" TEXT,
    "status" "public"."WrongAssignmentReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WrongAssignmentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WrongAssignmentReport_bookingUid_key" ON "public"."WrongAssignmentReport"("bookingUid");

-- CreateIndex
CREATE INDEX "WrongAssignmentReport_reportedById_idx" ON "public"."WrongAssignmentReport"("reportedById");

-- CreateIndex
CREATE INDEX "WrongAssignmentReport_teamId_idx" ON "public"."WrongAssignmentReport"("teamId");

-- CreateIndex
CREATE INDEX "WrongAssignmentReport_routingFormId_idx" ON "public"."WrongAssignmentReport"("routingFormId");

-- CreateIndex
CREATE INDEX "WrongAssignmentReport_status_idx" ON "public"."WrongAssignmentReport"("status");

-- CreateIndex
CREATE INDEX "WrongAssignmentReport_createdAt_idx" ON "public"."WrongAssignmentReport"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."WrongAssignmentReport" ADD CONSTRAINT "WrongAssignmentReport_bookingUid_fkey" FOREIGN KEY ("bookingUid") REFERENCES "public"."Booking"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WrongAssignmentReport" ADD CONSTRAINT "WrongAssignmentReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WrongAssignmentReport" ADD CONSTRAINT "WrongAssignmentReport_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WrongAssignmentReport" ADD CONSTRAINT "WrongAssignmentReport_routingFormId_fkey" FOREIGN KEY ("routingFormId") REFERENCES "public"."App_RoutingForms_Form"("id") ON DELETE SET NULL ON UPDATE CASCADE;
