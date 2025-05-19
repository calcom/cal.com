-- DropForeignKey
ALTER TABLE "RoutingFormResponseDenormalized" DROP CONSTRAINT "RoutingFormResponseDenormalized_eventTypeId_fkey";

-- DropForeignKey
ALTER TABLE "RoutingFormResponseField" DROP CONSTRAINT "RoutingFormResponseField_response_fkey";

-- AlterTable
ALTER TABLE "RoutingFormResponseField" ALTER COLUMN "responseId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "App_RoutingForms_FormResponse_routedToBookingUid_idx" ON "App_RoutingForms_FormResponse"("routedToBookingUid");

-- CreateIndex
CREATE INDEX "DelegationCredential_enabled_idx" ON "DelegationCredential"("enabled");

-- AddForeignKey
ALTER TABLE "RoutingFormResponseField" ADD CONSTRAINT "RoutingFormResponseField_response_fkey" FOREIGN KEY ("responseId") REFERENCES "App_RoutingForms_FormResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingFormResponseField" ADD CONSTRAINT "RoutingFormResponseField_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "RoutingFormResponseDenormalized"("id") ON DELETE SET NULL ON UPDATE CASCADE;
