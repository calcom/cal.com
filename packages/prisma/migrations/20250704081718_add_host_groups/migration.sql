-- AlterTable
ALTER TABLE "Host" ADD COLUMN     "groupId" TEXT;

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

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "HostGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostGroup" ADD CONSTRAINT "HostGroup_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
