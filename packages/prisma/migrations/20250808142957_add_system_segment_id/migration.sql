-- AlterTable
ALTER TABLE "Host" ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "memberId" INTEGER;

-- AlterTable
ALTER TABLE "UserFilterSegmentPreference" ADD COLUMN     "systemSegmentId" TEXT,
ALTER COLUMN "segmentId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "HostGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventTypeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HostGroup_name_idx" ON "HostGroup"("name");

-- CreateIndex
CREATE INDEX "HostGroup_eventTypeId_idx" ON "HostGroup"("eventTypeId");

-- CreateIndex
CREATE INDEX "Host_memberId_idx" ON "Host"("memberId");

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "HostGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostGroup" ADD CONSTRAINT "HostGroup_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
