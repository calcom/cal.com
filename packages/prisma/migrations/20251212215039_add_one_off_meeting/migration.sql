-- CreateEnum
CREATE TYPE "public"."OneOffMeetingStatus" AS ENUM ('active', 'booked', 'expired', 'cancelled');

-- CreateTable
CREATE TABLE "public"."OneOffMeeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "location" JSONB,
    "timeZone" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "linkHash" TEXT NOT NULL,
    "status" "public"."OneOffMeetingStatus" NOT NULL DEFAULT 'active',
    "bookedAt" TIMESTAMP(3),
    "bookingId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "OneOffMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OneOffMeetingSlot" (
    "id" TEXT NOT NULL,
    "oneOffMeetingId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OneOffMeetingSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OneOffMeeting_linkHash_key" ON "public"."OneOffMeeting"("linkHash");

-- CreateIndex
CREATE UNIQUE INDEX "OneOffMeeting_bookingId_key" ON "public"."OneOffMeeting"("bookingId");

-- CreateIndex
CREATE INDEX "OneOffMeeting_userId_idx" ON "public"."OneOffMeeting"("userId");

-- CreateIndex
CREATE INDEX "OneOffMeeting_linkHash_idx" ON "public"."OneOffMeeting"("linkHash");

-- CreateIndex
CREATE INDEX "OneOffMeeting_status_idx" ON "public"."OneOffMeeting"("status");

-- CreateIndex
CREATE INDEX "OneOffMeeting_createdAt_idx" ON "public"."OneOffMeeting"("createdAt");

-- CreateIndex
CREATE INDEX "OneOffMeetingSlot_oneOffMeetingId_idx" ON "public"."OneOffMeetingSlot"("oneOffMeetingId");

-- AddForeignKey
ALTER TABLE "public"."OneOffMeeting" ADD CONSTRAINT "OneOffMeeting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OneOffMeeting" ADD CONSTRAINT "OneOffMeeting_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OneOffMeetingSlot" ADD CONSTRAINT "OneOffMeetingSlot_oneOffMeetingId_fkey" FOREIGN KEY ("oneOffMeetingId") REFERENCES "public"."OneOffMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
