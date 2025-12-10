-- AlterTable
ALTER TABLE "public"."TeamFeatures" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."UserFeatures" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true;
