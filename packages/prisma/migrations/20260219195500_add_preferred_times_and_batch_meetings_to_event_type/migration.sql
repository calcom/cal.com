-- AlterTable
ALTER TABLE "EventType"
ADD COLUMN "preferredTimes" JSONB,
ADD COLUMN "batchMeetingsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "batchMeetingsSize" INTEGER NOT NULL DEFAULT 2;
