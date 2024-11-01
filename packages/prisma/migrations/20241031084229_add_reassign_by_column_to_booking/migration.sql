-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "reassignById" INTEGER;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_reassignById_fkey" FOREIGN KEY ("reassignById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
