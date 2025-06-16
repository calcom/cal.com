/*
  Warnings:

  - A unique constraint covering the columns `[actualResponseId]` on the table `App_RoutingForms_QueuedFormResponse` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "App_RoutingForms_FormResponse" ADD COLUMN     "queuedFormResponseId" TEXT;

-- AlterTable
ALTER TABLE "App_RoutingForms_QueuedFormResponse" ADD COLUMN     "actualResponseId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "App_RoutingForms_QueuedFormResponse_actualResponseId_key" ON "App_RoutingForms_QueuedFormResponse"("actualResponseId");

-- AddForeignKey
ALTER TABLE "App_RoutingForms_QueuedFormResponse" ADD CONSTRAINT "App_RoutingForms_QueuedFormResponse_actualResponseId_fkey" FOREIGN KEY ("actualResponseId") REFERENCES "App_RoutingForms_FormResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
