-- AlterTable: Add enabled column with DEFAULT true so existing rows get enabled=true
ALTER TABLE "public"."TeamFeatures" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Add enabled column with DEFAULT true so existing rows get enabled=true
ALTER TABLE "public"."UserFeatures" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true;

-- Remove the DEFAULT constraint so new rows must explicitly set enabled
ALTER TABLE "public"."TeamFeatures" ALTER COLUMN "enabled" DROP DEFAULT;
ALTER TABLE "public"."UserFeatures" ALTER COLUMN "enabled" DROP DEFAULT;
