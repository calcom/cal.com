-- AlterTable
ALTER TABLE "CreditBalance" ADD COLUMN     "autoTopUpAmount" INTEGER,
ADD COLUMN     "autoTopUpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoTopUpThreshold" INTEGER;
