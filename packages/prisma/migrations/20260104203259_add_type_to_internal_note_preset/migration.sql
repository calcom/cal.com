-- CreateEnum
CREATE TYPE "InternalNotePresetType" AS ENUM ('CANCELLATION', 'REJECTION');

-- AlterTable
ALTER TABLE "InternalNotePreset" ADD COLUMN "type" "InternalNotePresetType" NOT NULL DEFAULT 'CANCELLATION';

-- DropIndex
DROP INDEX IF EXISTS "InternalNotePreset_teamId_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "InternalNotePreset_teamId_name_type_key" ON "InternalNotePreset"("teamId", "name", "type");

