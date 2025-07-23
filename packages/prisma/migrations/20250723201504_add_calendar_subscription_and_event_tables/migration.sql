-- CreateTable
CREATE TABLE "CalendarSubscription" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "integration" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "credentialId" INTEGER,
    "delegationCredentialId" INTEGER,
    "googleChannelId" TEXT,
    "googleChannelToken" TEXT,
    "googleChannelExpiration" TEXT,
    "nextSyncToken" TEXT,
    "lastFullSync" TIMESTAMP(3),
    "syncErrors" INTEGER NOT NULL DEFAULT 0,
    "maxSyncErrors" INTEGER NOT NULL DEFAULT 5,
    "backoffUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "calendarSubscriptionId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "iCalUID" TEXT,
    "etag" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "description" TEXT,
    "location" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "transparency" TEXT NOT NULL DEFAULT 'opaque',
    "visibility" TEXT NOT NULL DEFAULT 'default',
    "recurringEventId" TEXT,
    "originalStartTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "googleCreatedAt" TIMESTAMP(3),
    "googleUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarSubscription_googleChannelExpiration_syncErrors_bac_idx" ON "CalendarSubscription"("googleChannelExpiration", "syncErrors", "backoffUntil");

-- CreateIndex
CREATE INDEX "CalendarSubscription_nextSyncToken_idx" ON "CalendarSubscription"("nextSyncToken");

-- CreateIndex
CREATE INDEX "CalendarSubscription_userId_integration_idx" ON "CalendarSubscription"("userId", "integration");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSubscription_userId_integration_externalId_key" ON "CalendarSubscription"("userId", "integration", "externalId");

-- CreateIndex
CREATE INDEX "CalendarEvent_calendarSubscriptionId_start_end_idx" ON "CalendarEvent"("calendarSubscriptionId", "start", "end");

-- CreateIndex
CREATE INDEX "CalendarEvent_calendarSubscriptionId_iCalUID_idx" ON "CalendarEvent"("calendarSubscriptionId", "iCalUID");

-- CreateIndex
CREATE INDEX "CalendarEvent_updatedAt_calendarSubscriptionId_idx" ON "CalendarEvent"("updatedAt", "calendarSubscriptionId");

-- CreateIndex
CREATE INDEX "CalendarEvent_start_end_status_idx" ON "CalendarEvent"("start", "end", "status");

-- CreateIndex
CREATE INDEX "CalendarEvent_googleEventId_idx" ON "CalendarEvent"("googleEventId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_calendarSubscriptionId_googleEventId_key" ON "CalendarEvent"("calendarSubscriptionId", "googleEventId");

-- AddForeignKey
ALTER TABLE "CalendarSubscription" ADD CONSTRAINT "CalendarSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSubscription" ADD CONSTRAINT "CalendarSubscription_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSubscription" ADD CONSTRAINT "CalendarSubscription_delegationCredentialId_fkey" FOREIGN KEY ("delegationCredentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_calendarSubscriptionId_fkey" FOREIGN KEY ("calendarSubscriptionId") REFERENCES "CalendarSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
