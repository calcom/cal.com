-- CreateEnum
CREATE TYPE "SchedulingMethod" AS ENUM ('optimizeAvailability', 'optimizeFairness');

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "schedulingMethod" "SchedulingMethod";