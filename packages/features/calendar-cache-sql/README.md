# Calendar Cache SQL System

A high-performance SQL-based calendar caching system for Cal.com that provides fast calendar availability queries and real-time webhook synchronization with Google Calendar.

## Overview

The Calendar Cache SQL system replaces the previous JSONB-based `CalendarCache` table with a robust structured SQL solution that:

- **Caches calendar events** in PostgreSQL for sub-second availability queries
- **Maintains real-time sync** with Google Calendar via webhooks
- **Provides team-based feature flags** for gradual rollouts
- **Ensures data consistency** with proper repository patterns
- **Handles cleanup** of old events automatically

## Architecture

### Core Components

```text
packages/features/calendar-cache-sql/
├── CalendarCacheService.ts           # Main cache service implementing Calendar interface
├── CalendarCacheSqlService.ts        # SQL-specific cache operations
├── CalendarSubscriptionService.ts    # Google Calendar webhook subscriptions
├── CalendarEventRepository.ts        # Event data access layer
├── CalendarSubscriptionRepository.ts # Subscription data access layer
├── GoogleCalendarWebhookService.ts   # Webhook processing service
├── CalendarCacheSqlCleanupService.ts # Cleanup service for old events
└── __tests__/                        # Comprehensive test suite
```

### Service Responsibilities

#### CalendarCacheService

Main service that implements the `Calendar` interface for cache operations:

- Fetches availability from cached events
- Integrates with repository pattern
- Provides fallback mechanisms

#### CalendarCacheSqlService

Handles SQL-specific calendar operations:

- Processes webhook events from Google Calendar
- Manages incremental and full sync operations
- Handles event creation, updates, and deletions

#### CalendarSubscriptionService

Manages Google Calendar webhook subscriptions:

- Creates and manages watch channels
- Handles subscription lifecycle
- Provides authentication for Google Calendar API

#### Repository Pattern

- **CalendarEventRepository**: CRUD operations for calendar events
- **CalendarSubscriptionRepository**: CRUD operations for subscriptions
- **Interface-based design** for easy testing and dependency injection

## Database Schema

### CalendarEvent Table

Stores cached calendar events with full Google Calendar metadata:

```sql
model CalendarEvent {
  id                     String @id @default(uuid())
  calendarSubscriptionId String

  // Google Calendar event data
  googleEventId String
  iCalUID       String?
  etag          String
  sequence      Int     @default(0)

  // Event details
  summary     String?
  description String?
  location    String?
  start       DateTime
  end         DateTime
  isAllDay    Boolean  @default(false)

  // Event metadata
  status       String @default("confirmed") // confirmed, tentative, cancelled
  transparency String @default("opaque")    // opaque, transparent
  visibility   String @default("default")   // default, public, private

  // Recurring events
  recurringEventId  String?
  originalStartTime DateTime?

  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  googleCreatedAt DateTime?
  googleUpdatedAt DateTime?

  // Relations
  calendarSubscription CalendarSubscription @relation(fields: [calendarSubscriptionId], references: [id], onDelete: Cascade)

  @@unique([calendarSubscriptionId, googleEventId])
  @@index([calendarSubscriptionId, start, end])
  @@index([start, end, status]) // For availability queries
}
```

### CalendarSubscription Table

Manages webhook subscriptions and sync state:

```sql
model CalendarSubscription {
  id                        String   @id @default(cuid())
  selectedCalendarId        String   @unique

  // Google webhook details
  googleChannelId           String?
  googleChannelKind         String?
  googleChannelResourceId   String?
  googleChannelResourceUri  String?
  googleChannelExpiration   String?

  // Sync state
  nextSyncToken             String?
  lastFullSync              DateTime?
  syncErrors                Int      @default(0)
  maxSyncErrors             Int      @default(5)
  backoffUntil              DateTime?

  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt

  // Relations
  selectedCalendar  SelectedCalendar  @relation(fields: [selectedCalendarId], references: [id], onDelete: Cascade)
  calendarEvents    CalendarEvent[]
}
```

## Feature Flags

⚠️ **IMPORTANT**: This is currently a **team-only feature**. Individual users cannot enable these features directly - they must be part of a team that has the feature flags enabled.

The system uses team-based feature flags for gradual rollouts:

### Available Flags

- **`calendar-cache-sql-read`** - Enable reading from SQL cache
- **`calendar-cache-sql-write`** - Enable writing to SQL cache
- **`calendar-cache-sql-cleanup`** - Enable cleanup of old events

### How to Enable Feature Flags

#### 1. Global Feature Flags (Required First)

First, ensure the global feature flags exist in the `Feature` table:

```sql
-- Check if features exist
SELECT slug, enabled FROM "Feature" WHERE slug IN (
  'calendar-cache-sql-read',
  'calendar-cache-sql-write',
  'calendar-cache-sql-cleanup'
);

-- If missing, add them (should be done via migration)
INSERT INTO "Feature" (slug, enabled, description, "type") VALUES
('calendar-cache-sql-read', true, 'Enable reading from SQL calendar cache', 'OPERATIONAL'),
('calendar-cache-sql-write', true, 'Enable writing to SQL calendar cache', 'OPERATIONAL'),
('calendar-cache-sql-cleanup', true, 'Enable cleanup of old calendar events', 'OPERATIONAL')
ON CONFLICT (slug) DO NOTHING;
```

#### 2. Team Feature Flags (Enable for Specific Teams)

Enable features for a specific team by inserting into the `TeamFeatures` table:

```sql
-- Find your team ID
SELECT id, name FROM "Team" WHERE name ILIKE '%your-team-name%';

-- Enable calendar cache SQL features for team (replace TEAM_ID with actual ID)
INSERT INTO "TeamFeatures" ("teamId", "featureId", "assignedAt", "assignedBy", "updatedAt") VALUES
(TEAM_ID, 'calendar-cache-sql-read', NOW(), 'manual-setup', NOW()),
(TEAM_ID, 'calendar-cache-sql-write', NOW(), 'manual-setup', NOW()),
(TEAM_ID, 'calendar-cache-sql-cleanup', NOW(), 'manual-setup', NOW())
ON CONFLICT ("teamId", "featureId") DO NOTHING;
```

#### 3. Verify Feature Flags

```sql
-- Check team features are enabled
SELECT tf."teamId", tf."featureId", t.name as team_name
FROM "TeamFeatures" tf
JOIN "Team" t ON t.id = tf."teamId"
WHERE tf."featureId" IN (
  'calendar-cache-sql-read',
  'calendar-cache-sql-write',
  'calendar-cache-sql-cleanup'
);
```

### Usage Pattern

```typescript
const { FeaturesRepository } = await import("@calcom/features/flags/features.repository");
const featureRepo = new FeaturesRepository();

// Check if user's team has the feature enabled
if (await featureRepo.checkIfUserHasFeature(userId, "calendar-cache-sql-read")) {
  // Use SQL cache system
  const cacheService = new CalendarCacheService(credential, subscriptionRepo, eventRepo);
  return await cacheService.getAvailability(dateFrom, dateTo, selectedCalendars);
} else {
  // Fallback to existing system
  return await legacyCalendarService.getAvailability(dateFrom, dateTo, selectedCalendars);
}
```

## Installation & Setup

### 1. Database Migration

The required database tables are created automatically via Prisma migrations. Ensure your database is up to date:

```bash
yarn workspace @calcom/prisma db-migrate
```

### 2. Feature Flag Seeding

Seed the feature flags using Prisma migration:

```bash
yarn prisma migrate dev --create-only --name seed_calendar_cache_sql_features
```

Example migration content:

```sql
-- Add calendar cache SQL features
INSERT INTO "Feature" ("slug", "enabled", "description", "type") VALUES
('calendar-cache-sql-read', true, 'Enable reading from SQL calendar cache', 'OPERATIONAL'),
('calendar-cache-sql-write', true, 'Enable writing to SQL calendar cache', 'OPERATIONAL'),
('calendar-cache-sql-cleanup', true, 'Enable cleanup of old calendar events', 'OPERATIONAL')
ON CONFLICT ("slug") DO NOTHING;
```

### 3. Webhook Configuration

Set up Google Calendar webhooks using the provided cron job:

```bash
# The cron job at /api/cron/calendar-subscriptions will automatically
# set up webhooks for users with the calendar-cache-sql-write feature enabled
```

#### Running Subscription Cron Locally

To populate the `CalendarSubscription` table locally:

```bash
# Method 1: Direct API call (requires CRON_API_KEY)
curl -X GET "http://localhost:3000/api/cron/calendar-subscriptions?apiKey=YOUR_CRON_API_KEY"

# Method 2: Using authorization header
curl -X GET "http://localhost:3000/api/cron/calendar-subscriptions" \
  -H "Authorization: YOUR_CRON_API_KEY"

# Method 3: Using CRON_SECRET (if configured)
curl -X GET "http://localhost:3000/api/cron/calendar-subscriptions" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Environment Variables Required:**

```bash
# Add to your .env.local
CRON_API_KEY=your-secret-key
# OR
CRON_SECRET=your-secret-key

# Google Calendar webhook URL (must be publicly accessible for webhooks)
GOOGLE_WEBHOOK_URL=https://your-domain.com/api/webhook/google-calendar-sql
```

**What the Cron Does:**

1. **Creates CalendarSubscription records** for eligible SelectedCalendars
2. **Sets up Google Calendar watch channels** for real-time webhook notifications
3. **Updates watch details** (channel ID, expiration, etc.) in the database
4. **Handles errors** and implements backoff strategies for failed subscriptions

#### Setting Up Webhooks for Local Development

For local webhook testing, you need a publicly accessible URL. Use the provided script:

```bash
# Install tmole (tunnelmole) for webhook tunneling
brew install tmole

# Run the webhook setup script
./scripts/test-gcal-webhooks.sh
```

**What the Script Does:**

1. **Starts tunnelmole** on port 3000 (or reuses existing session)
2. **Extracts the public URL** from tunnelmole logs
3. **Updates GOOGLE_WEBHOOK_URL** in your `.env` file automatically
4. **Keeps the tunnel active** until you stop it with Ctrl+C

**Alternative Manual Setup:**

```bash
# Start tmole manually
tmole 3000

# Copy the generated URL and add to .env
echo "GOOGLE_WEBHOOK_URL=https://abc123.tunnelmole.net" >> .env

# Test webhook endpoint
curl -X POST "https://abc123.tunnelmole.net/api/webhook/google-calendar-sql" \
  -H "X-Goog-Channel-ID: test-channel" \
  -H "X-Goog-Resource-ID: test-resource"
```

### 4. Environment Variables

Ensure the following environment variables are configured:

```bash
# Google Calendar webhook URL (must be publicly accessible)
GOOGLE_WEBHOOK_URL=https://your-domain.com/api/webhook/google-calendar-sql

# Database connection
DATABASE_URL=postgresql://...
```

## Usage Examples

### Basic Availability Query

```typescript
import { CalendarCacheService } from "@calcom/features/calendar-cache-sql/CalendarCacheService";
import { CalendarEventRepository } from "@calcom/features/calendar-cache-sql/CalendarEventRepository";
import { CalendarSubscriptionRepository } from "@calcom/features/calendar-cache-sql/CalendarSubscriptionRepository";

// Initialize repositories
const eventRepo = new CalendarEventRepository(prisma);
const subscriptionRepo = new CalendarSubscriptionRepository(prisma);

// Create cache service
const cacheService = new CalendarCacheService(credential, subscriptionRepo, eventRepo);

// Query availability
const busyTimes = await cacheService.getAvailability(
  "2024-01-01T00:00:00Z",
  "2024-01-02T00:00:00Z",
  selectedCalendars
);

console.log(busyTimes);
// [
//   {
//     start: "2024-01-01T10:00:00.000Z",
//     end: "2024-01-01T11:00:00.000Z",
//     source: "calendar-cache-sql"
//   }
// ]
```

### Processing Webhook Events

```typescript
import { GoogleCalendarWebhookService } from "@calcom/features/calendar-cache-sql/GoogleCalendarWebhookService";

const webhookService = new GoogleCalendarWebhookService({
  subscriptionRepo,
  eventRepo,
  calendarCacheService,
  getCredentialForCalendarCache,
  logger,
});

// Process incoming webhook
const response = await webhookService.processWebhook(channelId);
console.log(response); // { status: 200, body: { message: "ok" } }
```

### Manual Cleanup

```typescript
import { CalendarCacheSqlCleanupService } from "@calcom/features/calendar-cache-sql/CalendarCacheSqlCleanupService";

const cleanupService = new CalendarCacheSqlCleanupService({
  eventRepo,
  logger,
});

const result = await cleanupService.runCleanup();
console.log(result); // { success: true }
```

## API Endpoints

### Webhook Endpoint

**POST** `/api/webhook/google-calendar-sql`

Processes Google Calendar webhook notifications for real-time event synchronization.

**Headers:**

- `X-Goog-Channel-ID`: Google webhook channel ID
- `X-Goog-Resource-ID`: Google resource ID

**Response:**

```json
{ "message": "ok" }
```

### Cron Jobs

**GET** `/api/cron/calendar-subscriptions`

Sets up Google Calendar webhook subscriptions for users with enabled features.

**GET** `/api/cron/calendar-cache-sql-cleanup`

Cleans up old calendar events (cancelled events >24h old, past events).

## Testing

### Running Tests

```bash
# Run all calendar cache SQL tests
TZ=UTC yarn test packages/features/calendar-cache-sql

# Run specific test file
TZ=UTC yarn test packages/features/calendar-cache-sql/CalendarCacheService.test.ts

# Run with coverage
TZ=UTC yarn test --coverage packages/features/calendar-cache-sql
```

### Test Structure

```text
__tests__/
├── CalendarCacheService.test.ts
├── CalendarCacheSqlService.test.ts
├── CalendarEventRepository.test.ts
├── CalendarSubscriptionRepository.test.ts
├── GoogleCalendarWebhookService.test.ts
└── CalendarCacheSqlCleanupService.test.ts
```

### Mock Data Patterns

Tests use Prismock for database mocking and follow these patterns:

```typescript
import prismock from "../../../tests/libs/__mocks__/prisma";

// Mock calendar event
const mockEvent = {
  id: "event-id",
  calendarSubscriptionId: "subscription-id",
  googleEventId: "google-event-id",
  summary: "Test Event",
  start: new Date("2024-01-01T10:00:00Z"),
  end: new Date("2024-01-01T11:00:00Z"),
  status: "confirmed",
};
```

## Performance Considerations

### Indexing Strategy

The system uses strategic database indexes for optimal query performance:

- **Availability queries**: `[calendarSubscriptionId, start, end]`
- **Batch queries**: `[start, end, status]`
- **Unique constraints**: `[calendarSubscriptionId, googleEventId]`

### Batch Operations

- **Bulk upserts** for processing multiple events
- **Transaction-based operations** for data consistency
- **Batch subscription queries** for multiple calendars

### Cleanup Strategy

- **Automatic cleanup** of cancelled events >24h old
- **Past event removal** to maintain database size
- **Configurable cleanup intervals** via cron jobs

## Troubleshooting

### Common Issues

#### TypeScript Errors

```bash
# Regenerate Prisma client
yarn prisma generate

# Run type checking
yarn type-check:ci
```

#### Missing Feature Flags

```sql
-- Manually add missing feature flags
INSERT INTO "Feature" ("slug", "enabled", "description", "type") VALUES
('calendar-cache-sql-read', true, 'Enable reading from SQL calendar cache', 'OPERATIONAL')
ON CONFLICT ("slug") DO NOTHING;
```

#### CalendarSubscription Table is Empty

If the subscription cron runs but no records are created:

```sql
-- Check if there are eligible SelectedCalendars
SELECT sc.id, sc.integration, sc."userId", u.email
FROM "SelectedCalendar" sc
JOIN "users" u ON u.id = sc."userId"
JOIN "Membership" m ON m."userId" = u.id
JOIN "TeamFeatures" tf ON tf."teamId" = m."teamId"
WHERE sc.integration = 'google_calendar'
  AND tf."featureId" = 'calendar-cache-sql-write';

-- Check if CalendarSubscriptions exist
SELECT COUNT(*) FROM "CalendarSubscription";

-- Check cron job logs for errors
```

#### CalendarEvents Table is Empty

If webhooks aren't populating events, check:

1. **Webhook Setup**: Verify Google Calendar webhooks are configured
2. **Webhook URL**: Ensure `GOOGLE_WEBHOOK_URL` is publicly accessible
3. **Webhook Processing**: Check webhook endpoint logs
4. **Manual Trigger**: Test webhook processing manually

```bash
# Test webhook endpoint (replace with actual channel ID)
curl -X POST "http://localhost:3000/api/webhook/google-calendar-sql" \
  -H "X-Goog-Channel-ID: test-channel-id" \
  -H "X-Goog-Resource-ID: test-resource-id"
```

#### Feature Flag Not Working

```sql
-- Debug feature flag chain
-- 1. Check if global feature exists
SELECT * FROM "Feature" WHERE slug = 'calendar-cache-sql-write';

-- 2. Check if team has feature
SELECT tf.*, t.name FROM "TeamFeatures" tf
JOIN "Team" t ON t.id = tf."teamId"
WHERE tf."featureId" = 'calendar-cache-sql-write';

-- 3. Check if user belongs to team with feature
SELECT u.email, m."teamId", tf."featureId"
FROM "users" u
JOIN "Membership" m ON m."userId" = u.id
JOIN "TeamFeatures" tf ON tf."teamId" = m."teamId"
WHERE u.id = YOUR_USER_ID
  AND tf."featureId" = 'calendar-cache-sql-write';
```

#### Webhook Failures

Check webhook setup and credentials:

```typescript
// Verify webhook channel is active
const subscription = await subscriptionRepo.findByChannelId(channelId);
console.log("Subscription:", subscription);

// Check credential validity
const credential = await getCredentialForCalendarCache({ credentialId });
console.log("Credential valid:", !!credential);
```

#### Sync Token Issues

Reset sync tokens for fresh synchronization:

```typescript
await subscriptionRepo.updateSyncToken(subscriptionId, null);
```

### Debugging

Enable debug logging by setting environment variables:

```bash
DEBUG=calendar-cache-sql:* yarn dev
```

### Monitoring

Monitor system health through:

- **Sync error counts** in CalendarSubscription table
- **Event counts** and cleanup effectiveness
- **Webhook response times** and success rates
- **Feature flag adoption** across teams

## Contributing

### Code Standards

- **No `as any` casting** - Use proper TypeScript types
- **Repository pattern** - Inject dependencies via constructors
- **Comprehensive tests** - Maintain >90% coverage
- **Feature flag integration** - Support gradual rollouts

### Development Workflow

1. Create feature branch from `main`
2. Implement changes with tests
3. Run `yarn type-check:ci`
4. Submit PR with detailed description
5. Ensure CI passes before merge

## License

This package is part of the Cal.com monorepo and follows the same licensing terms.

---

For more detailed implementation information, see [calendar-cache-sql-requirements.md](./calendar-cache-sql-requirements.md).
