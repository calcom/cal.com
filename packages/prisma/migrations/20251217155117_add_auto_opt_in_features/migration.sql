-- AlterTable
ALTER TABLE "public"."Team" ADD COLUMN     "autoOptInFeatures" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "autoOptInFeatures" BOOLEAN NOT NULL DEFAULT false;
