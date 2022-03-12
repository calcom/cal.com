-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "afterEventBuffer" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "beforeEventBuffer" INTEGER NOT NULL DEFAULT 0;