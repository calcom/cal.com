-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "smsLockReviewedByAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "smsLockReviewByAdmin" BOOLEAN NOT NULL DEFAULT false;
