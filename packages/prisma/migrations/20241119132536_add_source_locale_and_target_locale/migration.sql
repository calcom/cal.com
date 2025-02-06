/*
  Warnings:

  - Added the required column `sourceLocale` to the `EventTypeTranslation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetLocale` to the `EventTypeTranslation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EventTypeTranslation" ADD COLUMN "sourceLocale" TEXT,
ADD COLUMN "targetLocale" TEXT;

-- Update data
UPDATE "EventTypeTranslation" SET 
  "sourceLocale" = "sourceLang",
  "targetLocale" = "targetLang";

-- Then make NOT NULL after data is copied
ALTER TABLE "EventTypeTranslation" 
  ALTER COLUMN "sourceLocale" SET NOT NULL,
  ALTER COLUMN "targetLocale" SET NOT NULL;