/*
  Warnings:

  - A unique constraint covering the columns `[credentialId,externalId]` on the table `OutOfOfficeReason` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "OutOfOfficeReason_credentialId_externalId_key" ON "OutOfOfficeReason"("credentialId", "externalId");
