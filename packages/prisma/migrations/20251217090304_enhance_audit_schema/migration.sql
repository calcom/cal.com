/*
  Warnings:

  - A unique constraint covering the columns `[credentialId]` on the table `AuditActor` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."AuditActor" ADD COLUMN     "credentialId" INTEGER;

-- CreateIndex
CREATE INDEX "AuditActor_credentialId_idx" ON "public"."AuditActor"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditActor_credentialId_key" ON "public"."AuditActor"("credentialId");
