-- AlterTable
ALTER TABLE "SelectedCalendar" ADD COLUMN     "cacheEnabled" BOOLEAN,
ADD COLUMN     "channelExpiration" TEXT,
ADD COLUMN     "channelId" TEXT,
ADD COLUMN     "channelKind" TEXT,
ADD COLUMN     "channelResourceId" TEXT,
ADD COLUMN     "channelResourceUri" TEXT,
ADD COLUMN     "syncCursor" TEXT,
ADD COLUMN     "syncEnabled" BOOLEAN;

-- CreateIndex
CREATE INDEX "SelectedCalendar_channelId_channelKind_channelExpiration_idx" ON "SelectedCalendar"("channelId", "channelKind", "channelExpiration");
