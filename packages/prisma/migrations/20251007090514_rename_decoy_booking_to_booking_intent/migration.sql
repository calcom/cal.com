/*
  Warnings:

  - You are about to drop the `DecoyBooking` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "BookingIntentStatus" AS ENUM ('BLOCKED', 'PENDING');

-- DropForeignKey
ALTER TABLE "DecoyBooking" DROP CONSTRAINT "DecoyBooking_eventTypeId_fkey";

-- DropForeignKey
ALTER TABLE "DecoyBooking" DROP CONSTRAINT "DecoyBooking_watchlistEventAuditId_fkey";

-- DropTable
DROP TABLE "DecoyBooking";

-- CreateTable
CREATE TABLE "BookingIntent" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "status" "BookingIntentStatus" NOT NULL,
    "organizerName" TEXT NOT NULL,
    "organizerEmail" TEXT NOT NULL,
    "attendees" JSONB NOT NULL,
    "responses" JSONB,
    "metadata" JSONB,
    "description" TEXT,
    "eventTypeId" INTEGER,
    "watchlistEventAuditId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "BookingIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingIntent_uid_key" ON "BookingIntent"("uid");

-- CreateIndex
CREATE INDEX "BookingIntent_uid_idx" ON "BookingIntent"("uid");

-- CreateIndex
CREATE INDEX "BookingIntent_eventTypeId_idx" ON "BookingIntent"("eventTypeId");

-- CreateIndex
CREATE INDEX "BookingIntent_watchlistEventAuditId_idx" ON "BookingIntent"("watchlistEventAuditId");

-- AddForeignKey
ALTER TABLE "BookingIntent" ADD CONSTRAINT "BookingIntent_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingIntent" ADD CONSTRAINT "BookingIntent_watchlistEventAuditId_fkey" FOREIGN KEY ("watchlistEventAuditId") REFERENCES "WatchlistEventAudit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
