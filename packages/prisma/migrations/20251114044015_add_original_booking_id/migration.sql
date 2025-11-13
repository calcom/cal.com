-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "originalBookingId" INTEGER;

-- CreateIndex
CREATE INDEX "Booking_fromReschedule_idx" ON "public"."Booking"("fromReschedule");

-- CreateIndex
CREATE INDEX "Booking_originalBookingId_idx" ON "public"."Booking"("originalBookingId");

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_originalBookingId_fkey" FOREIGN KEY ("originalBookingId") REFERENCES "public"."Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
