-- CreateEnum
CREATE TYPE "public"."WebhookEventStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."WebhookEvent" (
    "id" UUID NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "status" "public"."WebhookEventStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_externalEventId_key" ON "public"."WebhookEvent"("externalEventId");
