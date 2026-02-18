-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."WatchlistType" ADD VALUE 'SPAM_KEYWORD';
ALTER TYPE "public"."WatchlistType" ADD VALUE 'SUSPICIOUS_DOMAIN';
ALTER TYPE "public"."WatchlistType" ADD VALUE 'EMAIL_PATTERN';
ALTER TYPE "public"."WatchlistType" ADD VALUE 'REDIRECT_DOMAIN';

-- CreateTable
CREATE TABLE "UserAbuseScore" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "abuseData" JSONB,
    "lastAnalyzedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAbuseScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAbuseScore_userId_key" ON "UserAbuseScore"("userId");

-- AddForeignKey
ALTER TABLE "UserAbuseScore" ADD CONSTRAINT "UserAbuseScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
