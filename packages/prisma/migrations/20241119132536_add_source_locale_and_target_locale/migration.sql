/*
  Warnings:

  - Added the required column `sourceLocale` to the `EventTypeTranslation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetLocale` to the `EventTypeTranslation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EventTypeTranslation" ADD COLUMN     "sourceLocale" TEXT NOT NULL,
ADD COLUMN     "targetLocale" TEXT NOT NULL;

-- Then update data
UPDATE "EventTypeTranslation" SET "sourceLocale" = "sourceLang", "targetLocale" = "targetLang";