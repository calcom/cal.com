-- DropIndex
DROP INDEX "Watchlist_organizationId_isGlobal_idx";

-- DropIndex
DROP INDEX "Watchlist_source_idx";

-- DropIndex
DROP INDEX "WatchlistAudit_id_key";

-- DropIndex
DROP INDEX "WatchlistEventAudit_eventTypeId_timestamp_idx";

-- DropIndex
DROP INDEX "WatchlistEventAudit_watchlistId_timestamp_idx";

-- CreateTable
CREATE TABLE "DecoyBooking" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'accepted',
    "organizerName" TEXT NOT NULL,
    "organizerEmail" TEXT NOT NULL,
    "attendees" JSONB NOT NULL,
    "responses" JSONB,
    "metadata" JSONB,
    "description" TEXT,
    "eventTypeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "DecoyBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DecoyBooking_uid_key" ON "DecoyBooking"("uid");

-- CreateIndex
CREATE INDEX "DecoyBooking_uid_idx" ON "DecoyBooking"("uid");

-- CreateIndex
CREATE INDEX "DecoyBooking_eventTypeId_idx" ON "DecoyBooking"("eventTypeId");

-- AddForeignKey
ALTER TABLE "DecoyBooking" ADD CONSTRAINT "DecoyBooking_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
