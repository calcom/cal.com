-- CreateTable
CREATE TABLE IF NOT EXISTS "FavoriteEventType" (
  "userId" INTEGER NOT NULL,
  "eventTypeId" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT timezone('UTC', now()),
  CONSTRAINT "FavoriteEventType_pkey" PRIMARY KEY ("userId", "eventTypeId"),
  CONSTRAINT "FavoriteEventType_user_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FavoriteEventType_eventType_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "FavoriteEventType_userId_idx" ON "FavoriteEventType" ("userId");
CREATE INDEX IF NOT EXISTS "FavoriteEventType_eventTypeId_idx" ON "FavoriteEventType" ("eventTypeId");
