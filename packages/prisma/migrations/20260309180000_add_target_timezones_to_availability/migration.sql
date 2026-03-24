-- AlterTable
ALTER TABLE "Availability" ADD COLUMN "targetTimeZones" TEXT[] DEFAULT ARRAY[]::TEXT[];
