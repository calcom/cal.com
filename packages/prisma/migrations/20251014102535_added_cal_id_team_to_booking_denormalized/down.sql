-- DropIndex
DROP INDEX "BookingDenormalized_calIdTeamId_idx";

-- DropIndex
DROP INDEX "BookingDenormalized_calIdTeamId_isTeamBooking_idx";

-- AlterTable
ALTER TABLE "BookingDenormalized" DROP COLUMN "calIdTeamId";