/*
  Warnings:

  - A unique constraint covering the columns `[externalRef]` on the table `CreditExpenseLog` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CreditExpenseLog" ADD COLUMN     "externalRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CreditExpenseLog_externalRef_key" ON "CreditExpenseLog"("externalRef");
