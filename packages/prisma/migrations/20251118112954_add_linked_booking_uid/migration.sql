-- AlterTable
ALTER TABLE "public"."BookingAudit" ADD COLUMN     "linkedBookingUid" TEXT;

-- CreateIndex
CREATE INDEX "BookingAudit_linkedBookingUid_idx" ON "public"."BookingAudit"("linkedBookingUid");
