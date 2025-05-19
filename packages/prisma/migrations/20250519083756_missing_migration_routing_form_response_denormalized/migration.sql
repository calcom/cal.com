-- DropForeignKey
ALTER TABLE "RoutingFormResponseDenormalized" DROP CONSTRAINT "RoutingFormResponseDenormalized_eventTypeId_fkey";

-- CreateIndex
CREATE INDEX "App_RoutingForms_FormResponse_routedToBookingUid_idx" ON "App_RoutingForms_FormResponse"("routedToBookingUid");

-- CreateIndex
CREATE INDEX "DelegationCredential_enabled_idx" ON "DelegationCredential"("enabled");
