/*
  Warnings:

  - A unique constraint covering the columns `[eventTypeId,field,targetLocale]` on the table `EventTypeTranslation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "EventTypeTranslation" ADD COLUMN     "uid" TEXT;

-- Copy data
UPDATE "EventTypeTranslation" SET 
  "uid" = "id";

-- CreateIndex
CREATE INDEX "EventTypeTranslation_eventTypeId_field_targetLocale_idx" ON "EventTypeTranslation"("eventTypeId", "field", "targetLocale");

-- CreateIndex
CREATE UNIQUE INDEX "EventTypeTranslation_eventTypeId_field_targetLocale_key" ON "EventTypeTranslation"("eventTypeId", "field", "targetLocale");

-- AddForeignKey
ALTER TABLE "EventTypeTranslation" ADD CONSTRAINT "EventTypeTranslation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTypeTranslation" ADD CONSTRAINT "EventTypeTranslation_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
