-- CreateTable
CREATE TABLE "public"."BookingCreatedLog" (
    "id" TEXT NOT NULL,
    "bookingUid" TEXT NOT NULL,
    "selectedCalendarIds" TEXT[],
    "availabilitySnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingCreatedLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingCreatedLog_bookingUid_idx" ON "public"."BookingCreatedLog"("bookingUid");

-- AddForeignKey
ALTER TABLE "public"."BookingCreatedLog" ADD CONSTRAINT "BookingCreatedLog_bookingUid_fkey" FOREIGN KEY ("bookingUid") REFERENCES "public"."Booking"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
