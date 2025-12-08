-- DropForeignKey
ALTER TABLE "public"."WatchlistAudit" DROP CONSTRAINT "WatchlistAudit_watchlistId_fkey";

-- AddForeignKey
ALTER TABLE "public"."WatchlistAudit" ADD CONSTRAINT "WatchlistAudit_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "public"."Watchlist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
