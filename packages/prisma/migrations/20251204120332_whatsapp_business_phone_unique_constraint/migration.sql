/*
  Warnings:

  - A unique constraint covering the columns `[phoneNumberId]` on the table `WhatsAppBusinessPhone` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phoneNumber]` on the table `WhatsAppBusinessPhone` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppBusinessPhone_phoneNumberId_key" ON "WhatsAppBusinessPhone"("phoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppBusinessPhone_phoneNumber_key" ON "WhatsAppBusinessPhone"("phoneNumber");
