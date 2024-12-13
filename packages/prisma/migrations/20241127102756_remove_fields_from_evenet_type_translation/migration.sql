/*
  Warnings:

  - The primary key for the `EventTypeTranslation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `EventTypeTranslation` table. All the data in the column will be lost.
  - You are about to drop the column `sourceLang` on the `EventTypeTranslation` table. All the data in the column will be lost.
  - You are about to drop the column `targetLang` on the `EventTypeTranslation` table. All the data in the column will be lost.
  - Made the column `uid` on table `EventTypeTranslation` required. This step will fail if there are existing NULL values in that column.

*/

-- Copy data
UPDATE "EventTypeTranslation" SET 
  "uid" = "id";

-- DropIndex
DROP INDEX "EventTypeTranslation_eventTypeId_field_targetLang_idx";

-- DropIndex
DROP INDEX "EventTypeTranslation_eventTypeId_field_targetLang_key";

-- AlterTable
ALTER TABLE "EventTypeTranslation" DROP CONSTRAINT "EventTypeTranslation_pkey",
DROP COLUMN "id",
DROP COLUMN "sourceLang",
DROP COLUMN "targetLang",
ALTER COLUMN "uid" SET NOT NULL,
ADD CONSTRAINT "EventTypeTranslation_pkey" PRIMARY KEY ("uid");
