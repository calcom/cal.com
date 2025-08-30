-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "dynamicEventSlugRef" TEXT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "dynamicGroupSlugRef" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "allowDynamicBooking" BOOLEAN DEFAULT true;