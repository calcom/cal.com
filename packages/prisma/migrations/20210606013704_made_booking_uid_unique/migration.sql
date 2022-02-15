/*
  Warnings:

  - A unique constraint covering the columns `[uid]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Booking.uid_unique" ON "Booking"("uid");
