-- DropForeignKey
ALTER TABLE "BookingReference" DROP CONSTRAINT "BookingReference_bookingId_fkey";

-- AddForeignKey
ALTER TABLE "BookingReference" ADD CONSTRAINT "BookingReference_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
