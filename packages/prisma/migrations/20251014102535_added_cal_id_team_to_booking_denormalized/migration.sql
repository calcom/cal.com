-- AlterTable
ALTER TABLE "BookingDenormalized" ADD COLUMN     "calIdTeamId" INTEGER;

-- CreateIndex
CREATE INDEX "BookingDenormalized_calIdTeamId_idx" ON "BookingDenormalized"("calIdTeamId");

-- CreateIndex
CREATE INDEX "BookingDenormalized_calIdTeamId_isTeamBooking_idx" ON "BookingDenormalized"("calIdTeamId", "isTeamBooking");

UPDATE "BookingDenormalized" bd
SET "calIdTeamId" = et."calIdTeamId"
FROM "EventType" et
WHERE bd."eventTypeId" = et."id";
