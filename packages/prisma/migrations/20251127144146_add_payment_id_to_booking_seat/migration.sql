/*
  Warnings:

  - A unique constraint covering the columns `[paymentId]` on the table `BookingSeat` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."BookingSeat" ADD COLUMN     "paymentId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "BookingSeat_paymentId_key" ON "public"."BookingSeat"("paymentId");

-- CreateIndex
CREATE INDEX "BookingSeat_paymentId_idx" ON "public"."BookingSeat"("paymentId");
