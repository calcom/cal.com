/*
  Warnings:

  - Added the required column `operationId` to the `BookingAudit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Add column with a default value for existing rows, then remove the default
ALTER TABLE "public"."BookingAudit" ADD COLUMN "operationId" TEXT NOT NULL DEFAULT 'legacy-operation';

-- Remove default for future inserts
ALTER TABLE "public"."BookingAudit" ALTER COLUMN "operationId" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "BookingAudit_operationId_idx" ON "public"."BookingAudit"("operationId");
