-- CreateEnum
CREATE TYPE "DistributionMethod" AS ENUM ('optimizeAvailability', 'optimizeFairness');

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "distributionMethod" "DistributionMethod" NOT NULL DEFAULT 'optimizeAvailability';