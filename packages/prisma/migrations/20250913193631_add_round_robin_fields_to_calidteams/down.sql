-- DropForeignKey
ALTER TABLE "InstantMeetingToken" DROP CONSTRAINT "InstantMeetingToken_calIdTeamId_fkey";

-- AlterTable
ALTER TABLE "InstantMeetingToken" DROP COLUMN "calIdTeamId";

-- AlterTable
ALTER TABLE "CalIdTeam" DROP COLUMN "bannerUrl",
DROP COLUMN "roundRobinResetInterval",
DROP COLUMN "roundRobinTimestampBasis";

-- DropEnum
DROP TYPE "RoundRobinResetInterval";

-- DropEnum
DROP TYPE "RoundRobinTimestampBasis";

