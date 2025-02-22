/*
  Warnings:

  - A unique constraint covering the columns `[oneTimePassword]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "oneTimePassword" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_oneTimePassword_key" ON "Booking"("oneTimePassword");
