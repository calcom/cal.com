-- CreateTable
CREATE TABLE "AIPhoneCallConfiguration" (
    "id" SERIAL NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "generalPrompt" TEXT NOT NULL,
    "yourPhoneNumber" TEXT NOT NULL,
    "numberToCall" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "beginMessage" TEXT,
    "llmId" TEXT,

    CONSTRAINT "AIPhoneCallConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIPhoneCallConfiguration_eventTypeId_idx" ON "AIPhoneCallConfiguration"("eventTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "AIPhoneCallConfiguration_eventTypeId_key" ON "AIPhoneCallConfiguration"("eventTypeId");

-- AddForeignKey
ALTER TABLE "AIPhoneCallConfiguration" ADD CONSTRAINT "AIPhoneCallConfiguration_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
