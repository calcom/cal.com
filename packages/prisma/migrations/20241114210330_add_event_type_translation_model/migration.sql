-- CreateEnum
CREATE TYPE "EventTypeAutoTranslatedField" AS ENUM ('DESCRIPTION');

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "autoTranslateDescriptionEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EventTypeTranslation" (
    "id" TEXT NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "field" "EventTypeAutoTranslatedField" NOT NULL,
    "sourceLang" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "EventTypeTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventTypeTranslation_eventTypeId_field_targetLang_idx" ON "EventTypeTranslation"("eventTypeId", "field", "targetLang");

-- CreateIndex
CREATE UNIQUE INDEX "EventTypeTranslation_eventTypeId_field_targetLang_key" ON "EventTypeTranslation"("eventTypeId", "field", "targetLang");

-- AddForeignKey
ALTER TABLE "EventTypeTranslation" ADD CONSTRAINT "EventTypeTranslation_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
