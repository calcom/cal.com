-- CreateTable
CREATE TABLE "public"."PendingGuest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingGuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingGuest_token_key" ON "public"."PendingGuest"("token");

-- CreateIndex
CREATE INDEX "PendingGuest_email_idx" ON "public"."PendingGuest"("email");

-- CreateIndex
CREATE INDEX "PendingGuest_bookingId_idx" ON "public"."PendingGuest"("bookingId");

-- CreateIndex
CREATE INDEX "PendingGuest_expiresAt_idx" ON "public"."PendingGuest"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PendingGuest_email_bookingId_key" ON "public"."PendingGuest"("email", "bookingId");

-- AddForeignKey
ALTER TABLE "public"."PendingGuest" ADD CONSTRAINT "PendingGuest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
