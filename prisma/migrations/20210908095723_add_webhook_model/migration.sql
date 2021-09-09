-- CreateEnum
CREATE TYPE "WebhookTriggerEvents" AS ENUM ('BOOKING_CREATED', 'BOOKING_RESCHEDULED', 'BOOKING_CANCELLED');

-- CreateTable
CREATE TABLE "Webhook" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "subscriberUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "eventTriggers" "WebhookTriggerEvents"[],

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEventTypes" (
    "webhookId" INTEGER NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("webhookId","eventTypeId")
);

-- AddForeignKey
ALTER TABLE "WebhookEventTypes" ADD FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEventTypes" ADD FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
