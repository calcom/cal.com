# packages/features/calendar

Unified calendar service layer for Cal.com. One service, all operations. No scattered logic, no leaking internals, no silent failures.

## Why This Exists

The current calendar implementation has fundamental problems that cost reliability, performance, and developer velocity.

### Calendar logic is scattered across 5+ packages

`CalendarManager` lives in `features/calendars/`. Cache logic lives in `features/calendar-cache-sql/`. Subscription handling lives in `features/calendar-subscription/`. CalDAV base service lives in `packages/lib/CalendarService.ts`. Provider-specific services live in `packages/app-store/*/lib/CalendarService.ts`.

Understanding how availability works requires reading files across all of them. Each package has its own error handling, its own credential logic, its own assumptions.

This package consolidates everything into one place. One service. One entry point.

### Invalid credentials are discovered at the worst moment

A user revokes Google access on Monday. Nobody knows until Thursday when they try to book and `getAvailability` returns a 401. The current code catches the error, logs it, and moves on. The credential stays active. The next request fails again.

This package fixes it in two ways:
- **Circuit breaker** — after 3 consecutive failures, the credential is skipped for 5 minutes. Availability checks return instantly instead of waiting for timeouts.
- **Credential invalidation** — on 401/403, the credential is marked as `invalid: true` in the database. It won't be used again until the user reconnects.

### Cache and availability are separate systems

The current code has `CalendarCacheWrapper` that proxies the entire `Calendar` interface — a 1:1 mirror of every method. The cache knows about `getAvailability`, `getAvailabilityWithTimeZones`, `createEvent`, and even `testDelegationCredentialSetup`. It's tightly coupled.

This package separates concerns:
- `CalendarCacheService` manages cache reads/writes for busy times only.
- `CalendarService` decides whether to use cache or adapter based on data freshness.
- The adapter knows nothing about cache. The cache knows nothing about providers.

### Subscription and sync are disconnected from CRUD

The current `CalendarSubscriptionService` in `features/calendar-subscription/` handles webhooks and sync. `CalendarManager` in `features/calendars/` handles CRUD and availability. They don't share error handling, credential logic, or observability. A webhook failure doesn't affect availability. An availability failure doesn't affect subscriptions.

This package puts everything in one service. A 401 during `processEvents` triggers the same credential invalidation as a 401 during `fetchBusyTimes`. One circuit breaker protects both paths.

### No transient error handling

Provider APIs return 503 and 429 regularly. The current code treats every failure the same — log it, maybe increment an error count. There's no distinction between "Google is down for 10 seconds" and "the user revoked access."

This package distinguishes transient from permanent errors:
- **Transient** (429, 503, timeouts) — don't increment error counts, don't reset sync tokens, don't invalidate credentials. Just retry next time.
- **Permanent** (401, 403) — increment error counts, invalidate credentials, mark as dead.

### Delegation credentials waste N requests instead of 1

See adapter README for details. The service layer groups calendars by credential ID, enabling batched `fetchBusyTimes` calls. 500 users → 10 requests instead of 500.

### One instance per credential doesn't scale

The old `CalendarService` receives a credential in the constructor — one instance per credential. Every call to `getAvailability` creates N service instances for N credentials, each with its own error handling, its own retry state, its own everything.

```typescript
// Old: N credentials = N instances, no shared state
const service = new CalendarService(credential, "caldav_calendar");
```

The new `CalendarService` is a singleton that receives credentials per method call. One instance handles all credentials, sharing a single circuit breaker map, a single cache service, and a single sync service. DI wires it once; every caller reuses the same instance.

```typescript
// New: 1 instance = all credentials, shared circuit breaker + cache
const service = getCalendarService();
service.createEvent(credential, event);
service.fetchBusyTimes({ credentials: [...], ... });
```

## Public API

```typescript
import { getCalendarService } from "@calcom/features/calendar/di/calendar-service.container";

const calendarService = getCalendarService();
```

### CRUD

```typescript
await calendarService.createEvent(credential, event, externalCalendarId?)
await calendarService.updateEvent(credential, uid, event, externalCalendarId?)
await calendarService.deleteEvent(credential, uid, event?, externalCalendarId?)
await calendarService.listCalendars(credential)
await calendarService.checkCredentialHealth(credential)
```

### Availability

```typescript
const busyTimes = await calendarService.fetchBusyTimes({
  credentials,        // CalendarCredential[] — from the database
  dateFrom,           // ISO string
  dateTo,             // ISO string
  selectedCalendars,  // SelectedCalendar[] — which calendars to check
});
```

What happens internally:
1. Date range is expanded by 11h before and 14h after (UTC edge cases).
2. Calendars are grouped by credential ID for batching.
3. Circuit breaker is checked — skip credentials that failed 3+ times in the last 5 minutes.
4. Calendars with recent `syncedAt` are served from cache.
5. Stale calendars fall back to the adapter.
6. On cache failure, those calendars also fall back to the adapter.
7. On adapter failure, the credential's circuit breaker is incremented.
8. On 401/403, the credential is invalidated in the database.

### Subscriptions

```typescript
await calendarService.subscribe(selectedCalendarId)
await calendarService.unsubscribe(selectedCalendarId)
await calendarService.processWebhook(provider, channelId)
await calendarService.checkForNewSubscriptions()
```

### Sync

```typescript
const result = await calendarService.processEvents(selectedCalendar);
// result: { eventsFetched: 12, eventsCached: 10, eventsSynced: 2 }
```

Events are routed to two destinations:
- **Cache** — non-cancelled events are upserted into `CalendarCacheEvent`. Cancelled events are deleted.
- **Sync** — events with `iCalUID` ending in `@cal.com` are detected as Cal.com-originated. Cancelled ones need booking cancellation. Confirmed ones may need rescheduling.

## Architecture

```
CalendarService (orchestrator)
├── CalendarCacheService (cache reads/writes)
│   └── PrismaCalendarCacheEventRepository (raw SQL bulk upserts)
├── CalendarSyncService (booking change detection)
├── SelectedCalendarRepository (subscription + sync metadata)
├── CredentialRepository (credential resolution + invalidation)
└── CalendarAdapter (from @calcom/calendar-adapter)
```

### Circuit Breaker

```
Request 1: credential 123 → timeout → fail (count: 1)
Request 2: credential 123 → 503     → fail (count: 2)
Request 3: credential 123 → 503     → fail (count: 3) ← threshold
Request 4: credential 123 → SKIP    ← circuit open
... 5 minutes later ...
Request 5: credential 123 → retry   ← cooldown expired, circuit reset
```

On 401/403:
```
Request 1: credential 123 → 401 → credential marked invalid in DB → never used again
```

### Cache-Aware Availability

```
Calendars with syncedAt < 7 days → serve from CalendarCacheEvent table
Calendars with syncedAt > 7 days → fetch from provider via adapter
Calendars with no syncedAt       → fetch from provider via adapter
Date range > 3 months            → bypass cache entirely
```

### Transient vs Permanent Errors

| Error | Transient? | Action |
|-------|-----------|--------|
| 429 (rate limited) | Yes | Log warning, retry next time |
| 503 (service unavailable) | Yes | Log warning, retry next time |
| Timeout | Yes | Log warning, retry next time |
| 401 (unauthorized) | No | Invalidate credential, circuit breaker |
| 403 (forbidden) | No | Invalidate credential, circuit breaker |
| 404 (not found) | No | Log error, increment error count |

## Dependencies

```typescript
interface CalendarServiceDeps {
  selectedCalendarRepo: SelectedCalendarRepository;
  credentialRepo: CredentialRepository;
  cacheService: CalendarCacheService;
  syncService: CalendarSyncService;
  config?: {
    hoursBeforeExpansion?: number;      // default: 11
    hoursAfterExpansion?: number;       // default: 14
    circuitBreakerThreshold?: number;   // default: 3
    circuitBreakerCooldownMs?: number;  // default: 300000 (5 min)
    webhookBaseUrl?: string;
    maxSubscribeErrors?: number;        // default: 3
    maxSyncErrors?: number;             // default: 3
    cacheEnabled?: (userId: number) => Promise<boolean>; // default: always true
    syncEnabled?: (userId: number) => Promise<boolean>;  // default: always true
  };
}
```

All deps are injected via constructor. `credentialRepo.resolve()` handles credential lookup, token refresh, and decryption — the service doesn't know how credentials are stored or encrypted. Observability (logger + metrics) is handled by `createCalendarAdapter` transparently.

## File Structure

```
packages/features/calendar/
  services/
    calendar-service.ts               — All operations: CRUD, availability, subscriptions, sync
    calendar-cache-service.ts         — Cache reads/writes for busy times
    calendar-sync-service.ts          — Cal.com event detection for booking sync
  repositories/
    credential-repository.ts                — Interface for credential resolution
    selected-calendar-repository.ts         — Interface for subscription + sync metadata
    calendar-cache-event-repository.ts      — Interface for cache event storage
    prisma-credential-repository.ts         — Prisma implementation: credential lookup + invalidation
    prisma-selected-calendar-repository.ts  — Prisma implementation: subscription + sync metadata
    prisma-calendar-cache-event-repository.ts — Prisma implementation: bulk event cache (raw SQL)
  di/
    tokens.ts                   — DI token definitions
    *.module.ts                 — Module loaders
    *.container.ts              — Container getters
  types.ts                      — FetchBusyTimesParams, ProcessEventsResult
  __tests__/
    calendar-service.test.ts              — Unit tests (80 tests)
    calendar-service.integration.test.ts  — Integration tests with in-memory fakes (8 tests)
    calendar-cache-service.test.ts        — Unit tests (31 tests)
    calendar-sync-service.test.ts         — Unit tests (34 tests)
    repositories.integration.test.ts      — Repository tests with mocked Prisma
```

## Status / Roadmap

### Done

- [x] CalendarService — CRUD, availability, subscriptions, event processing
- [x] CalendarCacheService — cache-aware busy time reads, event upsert/delete
- [x] CalendarSyncService — Cal.com event detection (cancel vs reschedule)
- [x] Circuit breaker with per-credential state and cooldown
- [x] Credential invalidation on 401/403
- [x] Transient vs permanent error handling
- [x] Repository interfaces and Prisma implementations
- [x] DI wiring (tokens, modules, containers)
- [x] Unit tests (176 tests) and integration tests
- [x] Repository integration tests with mocked Prisma

### In Progress

- [ ] Wire `CalendarSyncService` to `bookingService.cancelByICalUID` / `rescheduleByICalUID`
- [ ] Add `lastWebhookReceivedAt` column to `SelectedCalendar` schema

### Pending

- [ ] Replace `CalendarManager` usage in booking handlers with new `CalendarService`
- [ ] Replace `CalendarCacheWrapper` with `CalendarCacheService`
- [ ] Replace `CalendarSubscriptionService` with `CalendarService.subscribe/unsubscribe`
- [ ] Migrate `getAvailability` to use `CalendarService.fetchBusyTimes`
- [ ] Remove legacy calendar packages once migration is complete
- [ ] Add Trigger.dev task for `checkForNewSubscriptions` (periodic cron)
- [ ] Add Trigger.dev task for `cleanupStaleCache` (periodic cron)
- [ ] Observability: structured metrics for cache hit rate, adapter latency, circuit breaker trips

## Tests

```bash
TZ=UTC yarn vitest run packages/features/calendar/__tests__/
```

176 tests covering:
- CRUD operations (single + multi-calendar write with `string | string[]`)
- Availability with cache-aware routing
- Circuit breaker (threshold boundary, cooldown, per-credential state, reset on success)
- Credential invalidation on 401/403 (but not 500/429)
- Credential resolution with token refresh
- Delegation credential batching
- Subscription lifecycle (subscribe, unsubscribe, webhook, renew)
- Event processing (cache + sync routing, Promise.allSettled failure paths)
- Transient error handling (no error count increment, no throw)
- Sync token reset after max errors
- Cal.com event detection (iCalUID filtering, case-insensitive, suffix-only)
- Booking sync categorization (cancel vs reschedule vs unknown status)
- Cache freshness boundaries (exact threshold, 1ms before/after)
- Cache bypass (date range > 3 months)
- Cache fallback (cache failure → adapter)
- Large batch processing (200 events, performance check)
- timeZone preservation through cache and adapter paths
- Feature flag integration (cache/sync controlled by existing flags)
