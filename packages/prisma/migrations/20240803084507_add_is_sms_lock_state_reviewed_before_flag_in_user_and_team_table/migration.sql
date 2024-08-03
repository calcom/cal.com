-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "isSMSLockStateReviewedBefore" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isSMSLockStateReviewedBefore" BOOLEAN NOT NULL DEFAULT false;
