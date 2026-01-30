-- AlterTable
ALTER TABLE "public"."WrongAssignmentReport" ADD COLUMN "routingFormId" TEXT;

-- CreateIndex
CREATE INDEX "WrongAssignmentReport_routingFormId_idx" ON "public"."WrongAssignmentReport"("routingFormId");

-- AddForeignKey
ALTER TABLE "public"."WrongAssignmentReport" ADD CONSTRAINT "WrongAssignmentReport_routingFormId_fkey" FOREIGN KEY ("routingFormId") REFERENCES "public"."App_RoutingForms_Form"("id") ON DELETE SET NULL ON UPDATE CASCADE;
