-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "isRRWeightsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Host" ADD COLUMN     "weight" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "weightAdjustment" INTEGER NOT NULL DEFAULT 0;
