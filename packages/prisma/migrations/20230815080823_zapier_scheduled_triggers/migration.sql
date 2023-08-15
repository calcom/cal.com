-- CreateTable
CREATE TABLE "ZapierScheduledTriggers" (
    "id" SERIAL NOT NULL,
    "jobName" TEXT NOT NULL,
    "subscriberUrl" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "startAfter" TIMESTAMP(3) NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZapierScheduledTriggers_pkey" PRIMARY KEY ("id")
);
