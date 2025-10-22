-- CreateTable
CREATE TABLE "PendingGuest" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "timeZone" TEXT NOT NULL,
    "locale" TEXT DEFAULT 'en',
    "bookingId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingGuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingGuest_bookingId_idx" ON "PendingGuest"("bookingId");

-- CreateIndex
CREATE INDEX "PendingGuest_email_idx" ON "PendingGuest"("email");

-- CreateIndex
CREATE INDEX "PendingGuest_createdAt_idx" ON "PendingGuest"("createdAt");

-- AddForeignKey
ALTER TABLE "PendingGuest" ADD CONSTRAINT "PendingGuest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
