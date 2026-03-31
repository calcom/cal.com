/*
  Warnings:

  - The values [USER,TEAM] on the enum `SMSAbuseEntityType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SMSAbuseEntityType_new" AS ENUM ('DEVICE', 'IP');
ALTER TABLE "SMSAbuseLock" ALTER COLUMN "entityType" TYPE "SMSAbuseEntityType_new" USING ("entityType"::text::"SMSAbuseEntityType_new");
ALTER TYPE "SMSAbuseEntityType" RENAME TO "SMSAbuseEntityType_old";
ALTER TYPE "SMSAbuseEntityType_new" RENAME TO "SMSAbuseEntityType";
DROP TYPE "SMSAbuseEntityType_old";
COMMIT;

-- AlterTable
ALTER TABLE "CalIdTeam" ADD COLUMN     "smsLockState" "SMSLockState" NOT NULL DEFAULT 'UNLOCKED';
