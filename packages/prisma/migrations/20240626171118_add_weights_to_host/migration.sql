-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "isRRWeightsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Host" ADD COLUMN     "weight" INTEGER,
ADD COLUMN     "weightAdjustment" INTEGER;
