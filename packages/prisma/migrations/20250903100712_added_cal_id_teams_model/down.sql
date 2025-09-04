-- AlterEnum
BEGIN;
CREATE TYPE "FilterSegmentScope_new" AS ENUM ('USER', 'TEAM');
ALTER TABLE "FilterSegment" ALTER COLUMN "scope" TYPE "FilterSegmentScope_new" USING ("scope"::text::"FilterSegmentScope_new");
ALTER TYPE "FilterSegmentScope" RENAME TO "FilterSegmentScope_old";
ALTER TYPE "FilterSegmentScope_new" RENAME TO "FilterSegmentScope";
DROP TYPE "FilterSegmentScope_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "EventType" DROP CONSTRAINT "EventType_calIdTeamId_fkey";

-- DropForeignKey
ALTER TABLE "VerificationToken" DROP CONSTRAINT "VerificationToken_calIdTeamId_fkey";

-- DropForeignKey
ALTER TABLE "Webhook" DROP CONSTRAINT "Webhook_calIdTeamId_fkey";

-- DropForeignKey
ALTER TABLE "VerifiedNumber" DROP CONSTRAINT "VerifiedNumber_calIdTeamId_fkey";

-- DropForeignKey
ALTER TABLE "VerifiedEmail" DROP CONSTRAINT "VerifiedEmail_calIdTeamId_fkey";

-- DropForeignKey
ALTER TABLE "FilterSegment" DROP CONSTRAINT "FilterSegment_calIdTeamId_fkey";

-- DropForeignKey
ALTER TABLE "CalIdMembership" DROP CONSTRAINT "CalIdMembership_calIdTeamId_fkey";

-- DropForeignKey
ALTER TABLE "CalIdMembership" DROP CONSTRAINT "CalIdMembership_userId_fkey";

-- DropIndex
DROP INDEX "EventType_calIdTeamId_idx";

-- DropIndex
DROP INDEX "EventType_calIdTeamId_slug_key";

-- DropIndex
DROP INDEX "FilterSegment_scope_calIdTeamId_tableIdentifier_idx";

-- AlterTable
ALTER TABLE "EventType" DROP COLUMN "calIdTeamId";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "timeZone" SET DEFAULT 'Europe/London',
ALTER COLUMN "weekStart" SET DEFAULT 'Sunday';

-- AlterTable
ALTER TABLE "VerificationToken" DROP COLUMN "calIdTeamId";

-- AlterTable
ALTER TABLE "Webhook" DROP COLUMN "calIdTeamId";

-- AlterTable
ALTER TABLE "VerifiedNumber" DROP COLUMN "calIdTeamId";

-- AlterTable
ALTER TABLE "VerifiedEmail" DROP COLUMN "calIdTeamId";

-- AlterTable
ALTER TABLE "FilterSegment" DROP COLUMN "calIdTeamId";

-- DropTable
DROP TABLE "CalIdTeam";

-- DropTable
DROP TABLE "CalIdMembership";

-- DropEnum
DROP TYPE "CalIdMembershipRole";

