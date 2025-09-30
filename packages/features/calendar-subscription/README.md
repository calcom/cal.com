# Calendar Cache and Sync

The **Calendar Cache and Sync** feature provides efficient calendar synchronization with intelligent caching to reduce API calls and ensure real-time updates across your Cal.com instance.

## Feature Overview

This feature introduces two complementary capabilities:

- **Calendar Cache**: Stores calendar availability data locally to reduce external API calls and improve performance
- **Calendar Sync**: Uses webhooks to automatically listen for calendar updates and apply changes in real-time

**Key Benefits:**
- **Efficiency**: Reduces API calls with optimized caching strategies
- **Reliability**: Guarantees updates through webhook event delivery  
- **Real-Time Sync**: Ensures calendars are always up-to-date with minimal latency
- **Scalability**: Supports multiple calendars and handles high-volume updates seamlessly

**Motivation:**
By subscribing to calendars via webhooks and implementing intelligent caching, you gain a smarter, faster, and more resource-friendly way to keep your data in sync. This eliminates the need for constant polling and reduces the load on external calendar APIs while ensuring data consistency.

## Environment Variables

- **GOOGLE_WEBHOOK_URL**: Optional, only used for local tests. Default points to application url.
- **GOOGLE_WEBHOOK_TOKEN**: Required, token to validate Google Webhook incoming.
- **MICROSOFT_WEBHOOK_URL**: Optional, only used for local tests. Default points to application url.
- **MICROSOFT_WEBHOOK_TOKEN**: Required, token to validate Microsoft Webhook incoming.

## Feature Flags

This feature is controlled by three feature flags that can be enabled independently:

### 1. calendar-subscription-cache  
Enables calendar cache recording and usage through calendars. This flag should be managed individually by teams.

```sql
INSERT INTO "Feature" ("slug", "enabled", "description", "type", "stale", "lastUsedAt", "createdAt", "updatedAt", "updatedBy") 
VALUES ('calendar-subscription-cache', false, 'Allow calendar cache to be recorded and used through calendars.', 'OPERATIONAL', false, NULL, NOW(), NOW(), NULL) 
ON CONFLICT (slug) DO NOTHING;
```

### 2. calendar-subscription-sync
Enables calendar sync globally for all users regardless of team or organization.

```sql
INSERT INTO "Feature" ("slug", "enabled", "description", "type", "stale", "lastUsedAt", "createdAt", "updatedAt", "updatedBy") 
VALUES ('calendar-subscription-sync', false, 'Enable calendar sync for all calendars globally.', 'OPERATIONAL', false, NULL, NOW(), NOW(), NULL) 
ON CONFLICT (slug) DO NOTHING;
```

## Enabling Features for Specific Users

To enable calendar cache features for specific users, add entries to the `UserFeatures` table:

```sql
-- Enable calendar-subscription-cache for user ID 123  
INSERT INTO "UserFeatures" ("userId", "featureId", "assignedAt", "assignedBy", "updatedAt") 
VALUES (123, 'calendar-subscription-cache', NOW(), 'admin', NOW()) 
ON CONFLICT ("userId", "featureId") DO NOTHING;

-- Enable calendar-subscription-sync for user ID 123
INSERT INTO "UserFeatures" ("userId", "featureId", "assignedAt", "assignedBy", "updatedAt") 
VALUES (123, 'calendar-subscription-sync', NOW(), 'admin', NOW()) 
ON CONFLICT ("userId", "featureId") DO NOTHING;
```

## Enabling Features for Specific Teams

To enable calendar cache features for specific teams, add entries to the `TeamFeatures` table:

```sql
-- Enable calendar-subscription-cache for team ID 456
INSERT INTO "TeamFeatures" ("teamId", "featureId", "assignedAt", "assignedBy", "updatedAt") 
VALUES (456, 'calendar-subscription-cache', NOW(), 'admin', NOW()) 
ON CONFLICT ("teamId", "featureId") DO NOTHING;

-- Enable calendar-subscription-sync for team ID 456
INSERT INTO "TeamFeatures" ("teamId", "featureId", "assignedAt", "assignedBy", "updatedAt") 
VALUES (456, 'calendar-subscription-sync', NOW(), 'admin', NOW()) 
ON CONFLICT ("teamId", "featureId") DO NOTHING;
```

## Architecture

The calendar cache and sync system consists of several key components:

### Database Schema
- **CalendarCacheEvent Table**: Stores cached calendar events with status tracking
- **SelectedCalendar Extensions**: Additional fields for sync state and webhook management including:
  - `channelId`: Webhook channel identifier
  - `channelResourceId`: Resource ID for webhook subscriptions
  - `channelResourceUri`: URI for webhook notifications
  - `channelKind`: Type of webhook channel
  - `channelExpiration`: Webhook subscription expiration time
  - `syncToken`: Token for incremental sync
  - `syncedAt`: Last successful sync timestamp
  - `syncErrorAt`: Last sync error timestamp
  - `syncErrorCount`: Number of consecutive sync errors
  - `syncSubscribedAt`: Webhook subscription timestamp

### Core Services
- **CalendarCacheEventRepository**: Manages cached event storage and retrieval
- **CalendarSubscriptionService**: Orchestrates webhook subscriptions and event processing
- **Provider-specific Adapters**: Handle calendar-specific sync logic (Google, Office365)

### Background Processes
- **Cron Jobs**: Automated processes for cache cleanup and calendar watching
- **Webhook Handlers**: Real-time event processing for calendar updates

### Integration Points
- **Calendar Providers**: Google Calendar, Office365, and other supported integrations
- **Webhook Endpoints**: Receive real-time notifications from calendar providers
- **Cache Layer**: Optimized storage for frequently accessed calendar data

For detailed technical implementation, see:
- Database migrations in `packages/prisma/migrations/`
