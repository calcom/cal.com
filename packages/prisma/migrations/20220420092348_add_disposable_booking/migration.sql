-- DropForeignKey
ALTER TABLE "BookingReference" DROP CONSTRAINT "BookingReference_bookingId_fkey";

-- CreateTable
CREATE TABLE "DisposableLink" (
    "id" SERIAL NOT NULL,
    "link" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "userId" INTEGER,
    "eventTypeId" INTEGER NOT NULL,
    "timeZone" TEXT,
    "remainingUsage" INTEGER NOT NULL DEFAULT 1,
    "expireOn" TIMESTAMP(3),
    "expired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DisposableLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_disposable_user" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DisposableLink_eventTypeId_key" ON "DisposableLink"("eventTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "DisposableLink_link_slug_key" ON "DisposableLink"("link", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "_disposable_user_AB_unique" ON "_disposable_user"("A", "B");

-- CreateIndex
CREATE INDEX "_disposable_user_B_index" ON "_disposable_user"("B");

-- AddForeignKey
ALTER TABLE "BookingReference" ADD CONSTRAINT "BookingReference_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisposableLink" ADD CONSTRAINT "DisposableLink_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_disposable_user" ADD FOREIGN KEY ("A") REFERENCES "DisposableLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_disposable_user" ADD FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;