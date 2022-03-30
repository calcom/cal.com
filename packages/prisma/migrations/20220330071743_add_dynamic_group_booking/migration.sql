-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "dynamicSlugRef" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "allowDynamicBooking" BOOLEAN DEFAULT false;