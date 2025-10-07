-- AlterTable
ALTER TABLE "DecoyBooking" ADD COLUMN     "watchlistEventAuditId" UUID;

-- CreateIndex
CREATE INDEX "DecoyBooking_watchlistEventAuditId_idx" ON "DecoyBooking"("watchlistEventAuditId");

-- AddForeignKey
ALTER TABLE "DecoyBooking" ADD CONSTRAINT "DecoyBooking_watchlistEventAuditId_fkey" FOREIGN KEY ("watchlistEventAuditId") REFERENCES "WatchlistEventAudit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
