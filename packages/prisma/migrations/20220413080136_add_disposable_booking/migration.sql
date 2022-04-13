/*
  Warnings:

  - A unique constraint covering the columns `[disposableLinkId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Availability" ADD COLUMN     "disposableLinkId" INTEGER;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "disposableLinkId" INTEGER;

-- CreateTable
CREATE TABLE "DisposableLink" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "locations" JSONB,
    "length" INTEGER NOT NULL,
    "userId" INTEGER,
    "timeZone" TEXT,
    "expired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DisposableLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_disposable_user" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_disposable_eventtype" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DisposableLink_link_slug_key" ON "DisposableLink"("link", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "_disposable_user_AB_unique" ON "_disposable_user"("A", "B");

-- CreateIndex
CREATE INDEX "_disposable_user_B_index" ON "_disposable_user"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_disposable_eventtype_AB_unique" ON "_disposable_eventtype"("A", "B");

-- CreateIndex
CREATE INDEX "_disposable_eventtype_B_index" ON "_disposable_eventtype"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_disposableLinkId_key" ON "Booking"("disposableLinkId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_disposableLinkId_fkey" FOREIGN KEY ("disposableLinkId") REFERENCES "DisposableLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_disposableLinkId_fkey" FOREIGN KEY ("disposableLinkId") REFERENCES "DisposableLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_disposable_user" ADD FOREIGN KEY ("A") REFERENCES "DisposableLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_disposable_user" ADD FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_disposable_eventtype" ADD FOREIGN KEY ("A") REFERENCES "DisposableLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_disposable_eventtype" ADD FOREIGN KEY ("B") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;