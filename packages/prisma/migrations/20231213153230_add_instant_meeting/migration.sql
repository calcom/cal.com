-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'awaiting_host';

-- AlterEnum
ALTER TYPE "WebhookTriggerEvents" ADD VALUE 'INSTANT_MEETING';

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "isInstantEvent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "InstantMeetingToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "teamId" INTEGER NOT NULL,
    "bookingId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstantMeetingToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstantMeetingToken_token_key" ON "InstantMeetingToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "InstantMeetingToken_bookingId_key" ON "InstantMeetingToken"("bookingId");

-- CreateIndex
CREATE INDEX "InstantMeetingToken_token_idx" ON "InstantMeetingToken"("token");

-- AddForeignKey
ALTER TABLE "InstantMeetingToken" ADD CONSTRAINT "InstantMeetingToken_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantMeetingToken" ADD CONSTRAINT "InstantMeetingToken_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
