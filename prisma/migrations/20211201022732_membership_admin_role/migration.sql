-- AlterEnum
ALTER TYPE "MembershipRole" ADD VALUE 'ADMIN';

-- RenameIndex
ALTER INDEX "DailyEventReference_bookingId_unique" RENAME TO "DailyEventReference.bookingId_unique";
