/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `OutOfOfficeReason` will be added. If there are existing duplicate values, this will fail.

*/

-- DropIndex
DROP INDEX "OutOfOfficeReason_reason_key";

-- AlterTable
ALTER TABLE "OutOfOfficeEntry" ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "OutOfOfficeReason" ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OutOfOfficeReason_externalId_key" ON "OutOfOfficeReason"("externalId");
