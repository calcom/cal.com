/*
  Warnings:

  - A unique constraint covering the columns `[externalRef]` on the table `CreditExpenseLog` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CreditExpenseLog" ADD COLUMN     "callDuration" INTEGER,
ADD COLUMN     "externalRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CreditExpenseLog_externalRef_key" ON "CreditExpenseLog"("externalRef");

-- CreateEnum
CREATE TYPE "CreditUsageType" AS ENUM ('SMS', 'CAL_AI_PHONE_CALL');

-- AlterTable
ALTER TABLE "CreditExpenseLog" ADD COLUMN     "creditFor" "CreditUsageType";

-- Add check constraint for CAL_AI_PHONE_CALL requiring callDuration
ALTER TABLE "CreditExpenseLog" ADD CONSTRAINT "CreditExpenseLog_cal_ai_phone_call_duration_required"
CHECK ("creditFor" != 'CAL_AI_PHONE_CALL' OR "callDuration" IS NOT NULL);
