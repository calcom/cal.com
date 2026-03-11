/*
  Warnings:

  - A unique constraint covering the columns `[integrationAttributeSyncId,attributeId]` on the table `AttributeSyncFieldMapping` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AttributeSyncFieldMapping_integrationAttributeSyncId_attrib_key" ON "public"."AttributeSyncFieldMapping"("integrationAttributeSyncId", "attributeId");
