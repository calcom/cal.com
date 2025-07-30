# Calendar Cache SQL System - AI Agent Prompt

## Overview

This prompt provides comprehensive context for working on the Cal.com calendar cache SQL system integration. The goal is to create standalone calendar services that integrate with SQL-based caching while maintaining team-based feature flags and proper separation of concerns.

## Project Context

### Repository: Cal.com

- **Monorepo structure** with packages in `packages/` and main app in `apps/web/`
- **TypeScript/Next.js** application with Prisma ORM
- **Feature flag system** for gradual rollouts and kill switches
- **Calendar integrations** via app-store packages (Google Calendar, Apple Calendar, etc.)

### Current Branch

- Working on existing PR: `devin/1753300938-calendar-cache-sql-system`
- **DO NOT create new branches** - work on existing PR branch
- **Current Status**: Branch is ahead of origin by 6 commits with recent cleanup and refactoring work

## Task Requirements

### Primary Objective

Create standalone `CalendarCacheService.ts` and `CalendarSubscriptionService.ts` within `packages/app-store/googlecalendar/lib/` that:

1. Handle their own authentication via `CalendarAuth`
2. Are consumed by SQL cache services in `packages/features/calendar-cache-sql/`
3. Fetch events from the new `CalendarEvent` table (not old `CalendarCache`)
4. Maintain team-based routing with global feature flags as kill switch

### Key Architecture Decisions

#### Standalone Services Pattern

```typescript
// CalendarCacheService.ts - handles cache operations
export class CalendarCacheService {
  private auth: CalendarAuth;
  private subscriptionRepo: ICalendarSubscriptionRepository;
  private eventRepo: ICalendarEventRepository;

  constructor(
    credential: CredentialForCalendarServiceWithEmail,
    subscriptionRepo: ICalendarSubscriptionRepository,
    eventRepo: ICalendarEventRepository
  ) {
    // Initialize with repositories for SQL-based caching
  }
}

// CalendarSubscriptionService.ts - handles webhook subscriptions
export class CalendarSubscriptionService {
  private auth: CalendarAuth;

  constructor(credential: CredentialForCalendarServiceWithEmail) {
    // Handle Google Calendar webhook subscriptions
  }
}
```

#### Integration Pattern

```typescript
// SQL cache services import and use standalone services
const { CalendarCacheService } = await import("@calcom/app-store/googlecalendar/lib/CalendarCacheService");
const cacheService = new CalendarCacheService(credential, subscriptionRepo, eventRepo);
```

## Completed Work

### ✅ Created Standalone Services

1. **CalendarCacheService.ts** - Extracts cache-related methods from main CalendarService
2. **CalendarSubscriptionService.ts** - Extracts subscription/webhook methods
3. **Updated SQL cache services** to consume standalone services instead of inheriting from CalendarService

### ✅ Fixed Integration Issues

1. **TypeScript errors resolved** - Proper type handling without "as any" casting
2. **Authentication maintained** - Both services use CalendarAuth pattern
3. **Repository pattern** - CalendarCacheService accepts repository dependencies
4. **SQL table integration** - Now fetches from CalendarEvent table, not old CalendarCache

### ✅ Recent Improvements (Latest Commits)

1. **Calendar Cache SQL Cleanup Service** - Added cleanup functionality for old events
2. **Google Calendar Webhook Dependencies** - Refactored webhook service dependencies
3. **Event Filtering** - Improved event filtering and processing logic
4. **Repository Naming** - Standardized repository naming conventions
5. **Service File Organization** - Improved file structure and consistency

### ✅ Verification Completed

- Calendar cache SQL tests pass
- Integration between standalone services and SQL cache verified
- Repository pattern correctly implemented

## Current Issues to Resolve

### TypeScript Errors (Blocking)

1. **FeaturesRepository Constructor** - `new FeaturesRepository(prisma)` expects 0 arguments but got 1

   - **File**: `apps/web/app/api/cron/calendar-cache-sql-cleanup/route.ts:26`
   - **Fix**: Remove `prisma` parameter from constructor call

2. **Feature Flag Type** - `"calendar-cache-sql-cleanup"` is not assignable to `keyof AppFlags`
   - **File**: `packages/features/calendar-cache-sql/CalendarCacheSqlCleanupService.ts:24`
   - **Fix**: Add the feature flag to the AppFlags type definition or use a different flag

### Required Actions

1. **Fix TypeScript Errors** - Resolve the 2 blocking TypeScript errors
2. **Run Type Check** - Ensure `yarn type-check:ci` passes with 0 errors
3. **Test Integration** - Verify all calendar cache SQL functionality works correctly

## Key Implementation Patterns

### Authentication Handling

```typescript
// All services use consistent CalendarAuth pattern
private auth: CalendarAuth;

constructor(credential: CredentialForCalendarServiceWithEmail) {
  this.credential = credential;
  this.auth = new CalendarAuth(credential);
}

public async getClient(): Promise<calendar_v3.Calendar> {
  return this.auth.getClient();
}
```

### Repository Dependency Injection

```typescript
// CalendarCacheService accepts repositories rather than hardcoding dependencies
constructor(
  credential: CredentialForCalendarServiceWithEmail,
  subscriptionRepo: ICalendarSubscriptionRepository,
  eventRepo: ICalendarEventRepository
) {
  this.subscriptionRepo = subscriptionRepo;
  this.eventRepo = eventRepo;
}
```

### Feature Flag Integration

```typescript
// Team-based feature flag checking with global kill switch
const featureRepo = new FeaturesRepository();
if (
  this.credential.userId &&
  (await featureRepo.checkIfUserHasFeature(this.credential.userId, "calendar-cache-sql-read"))
) {
  // Use SQL cache system
} else {
  // Fallback to old system (during transition)
}
```

## Database Schema

### CalendarEvent Table (Updated)

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
  transparency String @default("opaque") // opaque, transparent
  visibility   String @default("default") // default, public, private

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
  @@index([calendarSubscriptionId, iCalUID])
  @@index([updatedAt, calendarSubscriptionId])
  @@index([start, end, status]) // For availability queries
  @@index([googleEventId])
}
```

### CalendarSubscription Table

```sql
model CalendarSubscription {
  id                        String   @id @default(cuid())
  credentialId              Int
  selectedCalendarId        Int
  googleChannelId           String?
  googleChannelResourceId   String?
  googleChannelExpiration   DateTime?
  nextSyncToken             String?
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt

  credential        Credential        @relation(fields: [credentialId], references: [id], onDelete: Cascade)
  selectedCalendar  SelectedCalendar  @relation(fields: [selectedCalendarId], references: [id], onDelete: Cascade)
  calendarEvents    CalendarEvent[]

  @@unique([credentialId, selectedCalendarId])
  @@map("CalendarSubscription")
}
```

## Critical Constraints

### Type Safety Requirements

- **NEVER use "as any" casting** - strictly forbidden in Cal.com codebase
- Use proper TypeScript interfaces and type definitions
- Leverage Prisma's generated types for database operations

### Code Quality Standards

- **Early returns preferred** - avoid deep nesting with null checks
- **Composition over prop drilling** - use dependency injection
- **Prisma best practices** - use `select` instead of `include`, never expose credential.key
- **Localization required** - use `t()` for all user-facing text

### Git Workflow

- Work on existing PR branch: `devin/1753300938-calendar-cache-sql-system`
- Use `git add <specific-files>` not `git add .`
- Run `yarn type-check:ci` before committing
- Monitor CI with `git_pr_checks wait="True"`

## Development Commands

### Setup

```bash
cd ~/repos/cal.com
yarn install
yarn workspace @calcom/prisma db-migrate  # for development
```

### Type Checking

```bash
yarn type-check:ci  # Must pass before committing
```

### Testing

```bash
TZ=UTC yarn test  # Use UTC timezone for consistent results
TZ=UTC yarn test packages/features/calendar-cache-sql/__tests__/calendar-cache-sql.service.test.ts
```

### Linting

```bash
yarn lint:report
yarn lint -- --fix
```

## Feature Flags

### Current Flags

- `calendar-cache-sql-read` - Enable reading from SQL cache tables
- `calendar-cache-sql-write` - Enable writing to SQL cache tables
- `calendar-cache-sql-cleanup` - Enable cleanup of old calendar events (NEW)
- Global flags maintained as kill switches

### Flag Checking Pattern

```typescript
const { FeaturesRepository } = await import("@calcom/features/flags/features.repository");
const featureRepo = new FeaturesRepository();

// Team-based check with user context
if (await featureRepo.checkIfUserHasFeature(userId, "calendar-cache-sql-read")) {
  // Use SQL cache
}

// Global kill switch (maintained in cron jobs and webhooks)
if (await featureRepo.checkIfFeatureIsEnabledGlobally("calendar-cache-sql-write")) {
  // Proceed with SQL operations
}
```

## File Structure

### Standalone Services

```
packages/app-store/googlecalendar/lib/
├── CalendarAuth.ts                    # Authentication handling
├── CalendarService.ts                 # Main calendar service (DO NOT MODIFY)
├── CalendarCacheService.ts            # ✅ Standalone cache service
└── CalendarSubscriptionService.ts     # ✅ Standalone subscription service
```

### SQL Cache Features

```
packages/features/calendar-cache-sql/
├── CalendarCacheSqlService.ts         # ✅ Main SQL cache service
├── CalendarSubscriptionService.ts     # ✅ SQL subscription service
├── CalendarEventRepository.ts         # ✅ Event repository implementation
├── CalendarSubscriptionRepository.ts  # ✅ Subscription repository implementation
├── CalendarEventRepository.interface.ts
├── CalendarSubscriptionRepository.interface.ts
├── CalendarCacheSqlCleanupService.ts # ✅ Cleanup service for old events
├── GoogleCalendarWebhookService.ts   # ✅ Webhook service for Google Calendar
└── __tests__/
    ├── CalendarCacheSqlService.test.ts
    ├── CalendarEventRepository.test.ts
    ├── CalendarSubscriptionRepository.test.ts
    ├── GoogleCalendarWebhookService.test.ts
    └── CalendarCacheSqlCleanupService.test.ts
```

### API Endpoints

```
apps/web/app/api/
├── cron/calendar-subscriptions/route.ts      # Cron job for subscriptions
├── cron/calendar-cache-sql-cleanup/route.ts     # Cron job for cleanup (NEW)
└── webhook/google-calendar-sql/route.ts          # Webhook handler
```

## Common Issues & Solutions

### TypeScript Errors

1. **Prisma model not found** - Run `yarn prisma generate`
2. **Type incompatibility** - Check import paths and use proper interfaces
3. **Null/undefined errors** - Add proper null checks before accessing properties
4. **Feature flag type errors** - Ensure feature flags are defined in AppFlags type

### Authentication Issues

1. **Missing client_email** - Ensure delegated credentials have required fields
2. **Auth failures** - Verify CalendarAuth is properly initialized with credential

### Repository Integration

1. **Missing dependencies** - Ensure repositories are passed to service constructors
2. **Query failures** - Verify database relationships and foreign keys

## Next Steps / Remaining Work

### Immediate Tasks (CRITICAL)

1. ❌ **Fix TypeScript Errors** - Resolve 2 blocking TypeScript errors
   - Fix FeaturesRepository constructor call
   - Add calendar-cache-sql-cleanup to AppFlags type
2. ❌ **Verify Type Check** - Ensure `yarn type-check:ci` passes with 0 errors
3. ❌ **Test Integration** - Verify all calendar cache SQL functionality works

### Completed Tasks

1. ✅ Fix CalendarCacheService to use CalendarEvent table (COMPLETED)
2. ✅ Update SQL cache services to consume standalone services (COMPLETED)
3. ✅ Verify TypeScript compatibility (COMPLETED)
4. ✅ Run tests and ensure integration works (COMPLETED)
5. ✅ Add cleanup service for old events (COMPLETED)
6. ✅ Refactor webhook dependencies (COMPLETED)
7. ✅ Improve event filtering (COMPLETED)

### Future Enhancements

1. **CalendarService Integration** - Add SQL cache routing to main CalendarService
2. **Performance Optimization** - Implement efficient caching strategies
3. **Error Handling** - Add comprehensive error handling and logging
4. **Monitoring** - Add metrics and observability for cache performance

## Success Criteria

### Technical Requirements

- [ ] All TypeScript checks pass (`yarn type-check:ci`)
- [ ] All tests pass (`TZ=UTC yarn test`)
- [ ] No "as any" type casting used
- [ ] Proper authentication handling maintained
- [ ] Repository pattern correctly implemented

### Functional Requirements

- [ ] CalendarCacheService fetches from CalendarEvent table
- [ ] CalendarSubscriptionService handles Google webhook subscriptions
- [ ] SQL cache services properly consume standalone services
- [ ] Feature flags work for team-based routing
- [ ] Global kill switches functional
- [ ] Cleanup service removes old events properly

### Integration Requirements

- [ ] Standalone services work independently
- [ ] No dependencies on old CalendarCache system
- [ ] Proper separation of concerns maintained
- [ ] Clean interfaces between components

## Contact & Resources

- **Repository**: https://github.com/calcom/cal.com
- **PR Branch**: `devin/1753300938-calendar-cache-sql-system`
- **Documentation**: Cal.com contributing guidelines
- **Architecture**: Monorepo with feature-based organization

---

_This prompt contains all learned context from implementing the calendar cache SQL system integration. Use it as a comprehensive guide for understanding the architecture, requirements, and implementation patterns._

_Last Updated: January 2025 - Current implementation has 2 blocking TypeScript errors that need immediate resolution._
