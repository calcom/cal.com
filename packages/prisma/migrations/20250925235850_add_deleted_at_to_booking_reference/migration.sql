-- AlterTable
ALTER TABLE "BookingReference" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "sid";
