-- CreateEnum
CREATE TYPE "SMSLockState" AS ENUM ('LOCKED', 'UNLOCKED', 'REVIEW_NEEDED');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "smsLockState" "SMSLockState" NOT NULL DEFAULT 'UNLOCKED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "smsLockState" "SMSLockState" NOT NULL DEFAULT 'UNLOCKED';
