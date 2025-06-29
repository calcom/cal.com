/*
  Warnings:

  - You are about to drop the `slot_cache` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "slot_cache" DROP CONSTRAINT "slot_cache_eventTypeId_fkey";

-- DropForeignKey
ALTER TABLE "slot_cache" DROP CONSTRAINT "slot_cache_userId_fkey";

-- DropTable
DROP TABLE "slot_cache";

-- CreateTable
CREATE TABLE "SlotCache" (
    "id" TEXT NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "slots" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlotCache_eventTypeId_userId_cacheKey_key" ON "SlotCache"("eventTypeId", "userId", "cacheKey");

-- AddForeignKey
ALTER TABLE "SlotCache" ADD CONSTRAINT "SlotCache_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotCache" ADD CONSTRAINT "SlotCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
