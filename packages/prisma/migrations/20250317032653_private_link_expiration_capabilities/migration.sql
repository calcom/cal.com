-- AlterTable
ALTER TABLE "HashedLink" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "maxUsageCount" INTEGER,
ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0;
