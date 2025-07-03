-- CreateTable
CREATE TABLE "ZoomVideoSettings" (
    "eventTypeId" INTEGER NOT NULL,
    "enableWaitingRoom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZoomVideoSettings_pkey" PRIMARY KEY ("eventTypeId")
);

-- AddForeignKey
ALTER TABLE "ZoomVideoSettings" ADD CONSTRAINT "ZoomVideoSettings_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
