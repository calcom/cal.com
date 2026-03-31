-- AlterEnum
BEGIN;
CREATE TYPE "SMSAbuseEntityType_new" AS ENUM ('USER', 'TEAM', 'IP');
ALTER TABLE "SMSAbuseLock" ALTER COLUMN "entityType" TYPE "SMSAbuseEntityType_new" USING ("entityType"::text::"SMSAbuseEntityType_new");
ALTER TYPE "SMSAbuseEntityType" RENAME TO "SMSAbuseEntityType_old";
ALTER TYPE "SMSAbuseEntityType_new" RENAME TO "SMSAbuseEntityType";
DROP TYPE "SMSAbuseEntityType_old";
COMMIT;

-- AlterTable
ALTER TABLE "CalIdTeam" DROP COLUMN "smsLockState";

