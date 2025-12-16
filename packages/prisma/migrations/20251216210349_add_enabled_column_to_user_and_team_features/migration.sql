-- AlterTable
ALTER TABLE "UserFeatures" ADD COLUMN "enabled" BOOLEAN;

-- AlterTable
ALTER TABLE "TeamFeatures" ADD COLUMN "enabled" BOOLEAN;

-- Set existing records to enabled=true (previously treated as enabled by presence)
UPDATE "UserFeatures" SET "enabled" = true WHERE "enabled" IS NULL;
UPDATE "TeamFeatures" SET "enabled" = true WHERE "enabled" IS NULL;

