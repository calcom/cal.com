/*
  Warnings:

  - A unique constraint covering the columns `[attendeeId]` on the table `BookingSeat` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "BookingSeat_attendeeId_key" ON "BookingSeat"("attendeeId");
