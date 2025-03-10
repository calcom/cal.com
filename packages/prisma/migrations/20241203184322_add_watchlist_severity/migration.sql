-- CreateEnum
CREATE TYPE "WatchlistSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "Watchlist" ADD COLUMN     "severity" "WatchlistSeverity" NOT NULL DEFAULT 'LOW';
