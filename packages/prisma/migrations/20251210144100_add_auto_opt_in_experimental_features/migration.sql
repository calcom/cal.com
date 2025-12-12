-- AlterTable
ALTER TABLE "public"."Team" ADD COLUMN     "autoOptInExperimentalFeatures" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "autoOptInExperimentalFeatures" BOOLEAN NOT NULL DEFAULT false;
