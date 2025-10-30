-- CreateTable
CREATE TABLE "public"."BookingCreatedLog" (
    "id" TEXT NOT NULL,
    "bookingUid" TEXT NOT NULL,
    "selectedCalendarIds" TEXT[],
    "availabilitySnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingCreatedLog_pkey" PRIMARY KEY ("id")
);
