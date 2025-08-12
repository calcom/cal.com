-- CreateTable
CREATE TABLE "Tracking" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_term" TEXT,
    "utm_content" TEXT,

    CONSTRAINT "Tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tracking_bookingId_key" ON "Tracking"("bookingId");

-- AddForeignKey
ALTER TABLE "Tracking" ADD CONSTRAINT "Tracking_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
