-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "isUnreachable" BOOLEAN DEFAULT false,
ADD COLUMN     "lastNotified" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notifyCalendarAlerts" BOOLEAN DEFAULT true;

-- CreateIndex
CREATE INDEX "Credential_isUnreachable_idx" ON "Credential"("isUnreachable");
