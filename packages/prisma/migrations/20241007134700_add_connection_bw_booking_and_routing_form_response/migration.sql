/*
  Warnings:

  - A unique constraint covering the columns `[routedToBookingUid]` on the table `App_RoutingForms_FormResponse` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "App_RoutingForms_FormResponse" ADD COLUMN     "routedToBookingUid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "App_RoutingForms_FormResponse_routedToBookingUid_key" ON "App_RoutingForms_FormResponse"("routedToBookingUid");

-- AddForeignKey
ALTER TABLE "App_RoutingForms_FormResponse" ADD CONSTRAINT "App_RoutingForms_FormResponse_routedToBookingUid_fkey" FOREIGN KEY ("routedToBookingUid") REFERENCES "Booking"("uid") ON DELETE SET NULL ON UPDATE CASCADE;
