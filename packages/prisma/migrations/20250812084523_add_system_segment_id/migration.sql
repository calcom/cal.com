-- AlterTable
ALTER TABLE "UserFilterSegmentPreference" ADD COLUMN     "systemSegmentId" TEXT,
ALTER COLUMN "segmentId" DROP NOT NULL;
