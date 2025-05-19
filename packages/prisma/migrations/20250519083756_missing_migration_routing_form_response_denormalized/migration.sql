-- DropForeignKey
ALTER TABLE "RoutingFormResponseDenormalized" DROP CONSTRAINT "RoutingFormResponseDenormalized_eventTypeId_fkey";

-- CreateIndex
CREATE INDEX "App_RoutingForms_FormResponse_routedToBookingUid_idx" ON "App_RoutingForms_FormResponse"("routedToBookingUid");

-- CreateIndex
CREATE INDEX "DelegationCredential_enabled_idx" ON "DelegationCredential"("enabled");

-- AddForeignKey
ALTER TABLE "RoutingFormResponseField" ADD CONSTRAINT "RoutingFormResponseField_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "RoutingFormResponseDenormalized"("id") ON DELETE CASCADE ON UPDATE CASCADE;
