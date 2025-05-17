-- DropForeignKey
ALTER TABLE "RoutingFormResponseDenormalized" DROP CONSTRAINT "RoutingFormResponseDenormalized_eventTypeId_fkey";

-- DropForeignKey
ALTER TABLE "RoutingFormResponseField" DROP CONSTRAINT "RoutingFormResponseField_response_fkey";

-- DropIndex
DROP INDEX "SelectedCalendar_integration_idx";

-- AlterTable
ALTER TABLE "RoutingFormResponseField" ALTER COLUMN "responseId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SelectedCalendar" ADD COLUMN     "lastErrorAt" TIMESTAMP(3),
ADD COLUMN     "maxAttempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "unwatchAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "watchAttempts" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "App_RoutingForms_FormResponse_routedToBookingUid_idx" ON "App_RoutingForms_FormResponse"("routedToBookingUid");

-- CreateIndex
CREATE INDEX "DelegationCredential_enabled_idx" ON "DelegationCredential"("enabled");

-- CreateIndex
CREATE INDEX "SelectedCalendar_watch_idx" ON "SelectedCalendar"("integration", "googleChannelExpiration", "error", "watchAttempts", "maxAttempts");

-- CreateIndex
CREATE INDEX "SelectedCalendar_unwatch_idx" ON "SelectedCalendar"("integration", "googleChannelExpiration", "error", "unwatchAttempts", "maxAttempts");

-- AddForeignKey
ALTER TABLE "RoutingFormResponseField" ADD CONSTRAINT "RoutingFormResponseField_response_fkey" FOREIGN KEY ("responseId") REFERENCES "App_RoutingForms_FormResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingFormResponseField" ADD CONSTRAINT "RoutingFormResponseField_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "RoutingFormResponseDenormalized"("id") ON DELETE SET NULL ON UPDATE CASCADE;
