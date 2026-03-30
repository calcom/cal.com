# @calcom/calendar-adapter

Technology-agnostic calendar adapter layer for Cal.com. One interface, all providers. No SDK leaks, no implementation details exposed, no scattered logic. Zero internal Cal.com dependencies — fully self-contained.

## Why This Exists

The current calendar implementation is broken in ways that cost us reliability, performance, and developer velocity. This adapter layer fixes all of them.

### Calendar logic is scattered across 4+ packages

Calendar-related code lives in `packages/app-store/*/lib/CalendarService.ts`, `packages/lib/CalendarService.ts`, `packages/features/calendars/`, `packages/features/calendar-subscription/`, and `packages/features/calendar-cache-sql/`. Understanding how we talk to Google requires reading files across all of them. The adapter consolidates each provider into **one file** in one package. Everything else imports `CalendarAdapter` — nobody needs to know if we use `googleapis`, `tsdav`, or raw `fetch` underneath.

### Every consumer needs to know the implementation

Today, `CalendarManager` knows about `CalendarService`, `CalendarCacheWrapper` knows about `Calendar` interface internals, `getCalendarsEvents` knows about credential types. The adapter creates a hard boundary — **consumers see only the public interface**: `createEvent`, `fetchBusyTimes`, `listCalendars`, `subscribe`, `fetchEvents`, `healthCheck`. The rest is invisible.

### Provider SDKs are everywhere

Google's `googleapis`, Microsoft's Graph API, `tsdav`, `ews-javascript-api` — imported directly across services, managers, subscription handlers, and cache wrappers. Swapping a provider or upgrading an SDK means touching dozens of files across multiple packages. The adapter confines each SDK to **one file**. If we ever need to replace `tsdav` or migrate from EWS to Graph for Exchange, it's a single-file change.

### Error handling is a mess

Google throws with `.code`, Office365 attaches `.status`, CalDAV throws generic `Error`, ICS Feed silently swallows failures and returns partial results without warning. Every consumer reimplements error parsing. The adapter standardizes everything through `CalendarAdapterError` — provider name, HTTP status, and a `transient` flag so the caller knows instantly whether to retry or give up.

### Every provider defines its own credential type

Google uses `OAuthCredential`, CalDAV uses `BasicAuthCredential`, Exchange uses `ExchangeCredential`, Feishu uses `FeishuAuthCredentials`. The consumer has to know which type to pass to which service. The adapter uses a single `CalendarCredential` discriminated union — the `type` field narrows the `key` automatically. The consumer passes the credential from the database and TypeScript guarantees correctness at compile time.

### Credentials blow up at the wrong time

When `credential.key` is missing `access_token`, the current code passes `undefined` all the way to the Google SDK, which throws a useless error 3 stack frames deep. The adapter validates required fields **at construction time** — you get `"GoogleCalendar: credential.key is missing required field 'access_token' (credentialId=123)"` before any API call happens.

### No retry for transient failures

Provider APIs return 503 and 429 regularly. The current code treats every failure as fatal — the user sees an error, the booking fails, the calendar goes stale. The adapter includes `fetchWithRetry` with exponential backoff. Transient failures are retried transparently. Users never know it happened.

### Delegation credentials waste N requests instead of 1

The current implementation creates one `GoogleCalendarService` per user credential and makes one `freebusy.query` call per user. For an organization with 500 users, that's 500 API calls. With a delegation credential, Google's freebusy API accepts **multiple calendars in a single request**. The adapter supports this natively — `fetchBusyTimes` accepts `calendars[]` from multiple users. The service layer can batch 500 users into 10 requests (50 calendars each) instead of 500 individual calls. That's a **50x reduction** in API calls for enterprise orgs.

### Office365 fetches 999 events instead of asking for busy times

The current Office365 implementation uses `calendarView` with `$top=999` to fetch up to 999 individual events, then manually filters by `showAs` status to derive busy times. The adapter supports pagination natively (`maxResults`, `pageToken`, `nextPageToken`) so providers can fetch in controlled batches instead of grabbing everything at once.

### No pagination in the design

The current `Calendar.getAvailability` returns all results in one shot. No `maxResults`, no `pageToken`. For calendars with thousands of events in a date range, this means either fetching everything or hardcoding arbitrary limits. The adapter adds pagination support on both `fetchBusyTimes` and `fetchEvents` — consumers control how much to fetch per page.

### Recurring event expansion is copy-pasted

CalDAV, Apple, and ICS Feed all need client-side RRULE expansion. The current code has the **exact same** ical.js iterator logic duplicated in `packages/lib/CalendarService.ts` and `packages/app-store/ics-feedcalendar/lib/CalendarService.ts` — same 365-iteration limit, same frequency filter, same timezone handling, copied line by line. The adapter centralizes this in a single `expandVEventsFromICal` helper that all three providers share.

### getAvailabilityWithTimeZones shouldn't exist

The current `Calendar` interface has an optional `getAvailabilityWithTimeZones` method. Only Google implements it. It's used in exactly one place (`getLuckyUser.ts`) for OOO detection. It exists because `getAvailability` doesn't return timezone data. The adapter fixes the root cause — Google's `fetchBusyTimes` populates `BusyTimeslot.timeZone` in the regular response. Consumers filter by field presence. One method instead of two.

### The Calendar interface has no concept of sync

The `Calendar` interface knows nothing about sync tokens, ETags, or incremental updates. The subscription system (`GoogleCalendarSubscription.adapter.ts`, `Office365CalendarSubscription.adapter.ts`) implements `fetchEvents` with sync tokens **completely outside** the calendar interface, in a parallel type hierarchy (`ICalendarSubscriptionPort`). The adapter unifies this — `fetchEvents` is an optional method that returns events with `syncToken`, `nextSyncToken`, `fullSyncRequired`, `etag`, and `iCalSequence`. One interface for everything.

### Invalid tokens are discovered at the worst possible moment

A user revokes Google access on Monday. Nobody knows until Thursday when they try to book and `getAvailability` returns a 401. No adapter in the current codebase has any health check mechanism. The new adapter adds `healthCheck` — a lightweight token validation that the service layer can call proactively. Combined with `subscribe` for push notifications and `lastWebhookReceivedAt` tracking, the system detects revoked tokens **before** users are affected.

### ICS Feed fails silently

If an ICS feed URL returns a 500 or times out, the current implementation silently skips it and returns partial availability data. The user sees incorrect availability with no indication that a feed failed. The adapter logs warnings for failed fetches so failures are visible in monitoring.

### No concept of read-only providers

ICS Feed implements `createEvent`, `updateEvent`, `deleteEvent` — they always throw. But the consumer doesn't know that until it calls them. The adapter makes this explicit — `listCalendars` returns `readOnly: true` for ICS feeds, so the service layer can skip write operations without trying and failing.

### Delegation logic is mixed into provider code

`testDelegationCredentialSetup` lives on the `Calendar` interface. Delegation-specific branching lives inside `GoogleCalendarService`. The adapter doesn't know or care about delegation — it receives a credential and makes API calls. The service layer decides whether to use a user token or a service account token. Clean separation.

### The interface is not cache/sync aware

The current `Calendar` interface was designed for request-response only — fetch availability, create event, done. It has no concept of sync tokens, ETags, pagination, or cache invalidation signals. These were bolted on later through `CalendarCacheWrapper`, `ICalendarSubscriptionPort`, and `fetchAvailabilityAndSetCache` — each adding their own parallel abstraction. The new adapter interface is **cache/sync aware from day one**: `fetchEvents` returns sync tokens and ETags, `fetchBusyTimes` supports pagination, and `subscribe`/`unsubscribe` enable push-based cache invalidation. A cache decorator doesn't need to mirror the entire interface — it wraps `fetchBusyTimes` and uses `fetchEvents` + sync tokens to know exactly when to invalidate.

### Calendar cache is welded to the Calendar interface

`CalendarCacheWrapper` proxies every method of the `Calendar` interface — `getAvailability`, `getAvailabilityWithTimeZones`, `createEvent`, `updateEvent`, `deleteEvent`, `listCalendars`, `fetchAvailabilityAndSetCache`, `testDelegationCredentialSetup`, `getCredentialId`. It's a 1:1 mirror. The adapter interface is smaller and supports sync tokens + ETags natively, so the cache becomes a thin decorator (`CalendarCacheDecorator`) with proper invalidation driven by sync tokens instead of time-based expiry.

## Public API

This is the only thing consumers need to know. Everything else is an implementation detail.

```typescript
import { createCalendarAdapter } from "@calcom/calendar-adapter/createCalendarAdapter";
import type { CalendarAdapter } from "@calcom/calendar-adapter/CalendarAdapter";
import type {
  // Credential
  CalendarCredential,

  // CRUD
  CalendarEventInput,
  CalendarEventResult,

  // Read
  BusyTimeslot,
  FetchBusyTimesInput,
  CalendarInfo,

  // Sync
  FetchEventsInput,
  FetchEventsResult,
  CalendarEvent,

  // Subscription
  SubscribeInput,
  SubscribeResult,
  UnsubscribeInput,

  // Health
  HealthCheckResult,
} from "@calcom/calendar-adapter/CalendarAdapterTypes";
```

### Interface

```typescript
interface CalendarAdapter {
  // CRUD
  createEvent(event, externalCalendarId?): Promise<CalendarEventResult>;
  updateEvent(uid, event, externalCalendarId?): Promise<CalendarEventResult | CalendarEventResult[]>;
  deleteEvent(uid, event?, externalCalendarId?): Promise<void>;

  // Read
  fetchBusyTimes(params): Promise<BusyTimeslot[]>;
  listCalendars(): Promise<CalendarInfo[]>;

  // Sync (optional — incremental event sync with tokens)
  fetchEvents?(params: FetchEventsInput): Promise<FetchEventsResult>;

  // Subscription (optional — push notifications)
  subscribe?(input: SubscribeInput): Promise<SubscribeResult>;
  unsubscribe?(input: UnsubscribeInput): Promise<void>;

  // Health (optional — token validation)
  healthCheck?(): Promise<HealthCheckResult>;
}
```

### Factory

```typescript
const adapter = createCalendarAdapter(credential.type, credential);
```

All providers are auto-registered. That's it. One line.

### Checking capabilities

```typescript
if (adapter.subscribe) { /* provider supports push notifications */ }
if (adapter.fetchEvents) { /* provider supports incremental sync */ }
if (adapter.healthCheck) { /* provider supports token validation */ }
```

## Observability

Built into `createCalendarAdapter` — every adapter is automatically wrapped with logging and metrics. Pass logger/metrics as optional third argument, or omit for noop defaults:

```typescript
// Without observability (noop logger/metrics)
const adapter = createCalendarAdapter(credential.type, credential);

// With observability
const adapter = createCalendarAdapter(credential.type, credential, { logger, metrics });
```

### What gets logged

```
[info]  google_calendar.fetchBusyTimes  credentialId=123  calendars=3  durationMs=245  slots=12
[info]  google_calendar.createEvent     credentialId=123  calendarId=primary  uid=abc  durationMs=180
[info]  google_calendar.subscribe       credentialId=123  channelId=ch-1  expiration=2026-03-31
[warn]  google_calendar.healthCheck     credentialId=123  valid=false  reason=token_expired
[error] office365_calendar.fetchBusyTimes  credentialId=789  status=401  transient=false  durationMs=95
```

### What gets metriced

| Metric | Type | When |
|--------|------|------|
| `calendar.adapter.call.success` | count | Every successful call |
| `calendar.adapter.call.error` | count | Every failed call (with `status`, `transient` tags) |
| `calendar.adapter.call.duration_ms` | distribution | Every call (success and error) |
| `calendar.adapter.busy_slots` | distribution | After `fetchBusyTimes` |
| `calendar.adapter.events_fetched` | distribution | After `fetchEvents` |
| `calendar.adapter.calendars_listed` | distribution | After `listCalendars` |
| `calendar.adapter.health.valid` | count | `healthCheck` returns valid |
| `calendar.adapter.health.invalid` | count | `healthCheck` returns invalid (with `reason` tag) |

### Logger and Metrics interfaces

```typescript
interface CalendarAdapterLogger {
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
}

interface CalendarAdapterMetrics {
  count(name: string, value: number, opts?: { attributes?: Record<string, string> }): void;
  distribution(name: string, value: number, opts?: { attributes?: Record<string, string> }): void;
}
```

Compatible with `@calcom/lib/logger` (Pino) and `@sentry/nextjs` metrics out of the box.

## Provider Matrix

| Provider | SDK | Subscribe | Health | Retry | Sync | RRULE | Notes |
|----------|-----|-----------|--------|-------|------|-------|-------|
| **Google** | `@googleapis/calendar` | ✅ | ✅ | — | ✅ | Server (freebusy) | Batches 50 calendars/request, returns `timeZone` |
| **Office 365** | Graph API (fetch) | ✅ | ✅ | ✅ | ✅ | Server (getSchedule) | Delta sync via `@odata.deltaLink` |
| **CalDAV** | `tsdav` | — | — | ✅ | — | Client (ical.js) | RFC 4791 compliant |
| **Apple** | `tsdav` (extends CalDAV) | — | — | ✅ | — | Client (ical.js) | Defaults to `caldav.icloud.com` |
| **Proton** | `tsdav` (extends CalDAV) | — | — | ✅ | — | Client (ical.js) | Requires Proton Bridge |
| **Exchange** | `ews-javascript-api` | — | — | — | — | Server (CalendarView) | Supports 2013+ |
| **Feishu** | fetch | ✅ | — | ✅ | — | Server (freebusy) | Shares base with Lark |
| **Lark** | fetch | ✅ | — | ✅ | — | Server (freebusy) | International Feishu |
| **Zoho** | fetch | — | — | ✅ | — | Server (freebusy) | Region-aware |
| **ICS Feed** | `ical.js` | — | — | ✅ | — | Client (ical.js) | **Read-only**, throws when all feeds fail |

## Credential

Named types per provider, combined into a `CalendarCredential` union. Each adapter accepts its own specific type — zero casts inside adapters:

```typescript
// Named types — each adapter accepts its own
interface GoogleCalendarCredential   { id: number; type: "google_calendar";   key: { access_token: string; ... } }
interface Office365CalendarCredential { id: number; type: "office365_calendar"; key: { access_token: string; ... } }
interface CalDAVCalendarCredential    { id: number; type: "caldav_calendar";    key: { username: string; password: string; url: string } }
// ... 7 more providers

// Union for consumers who don't care about the specific provider
type CalendarCredential =
  | GoogleCalendarCredential
  | Office365CalendarCredential
  | CalDAVCalendarCredential
  | AppleCalendarCredential
  | ProtonCalendarCredential
  | ExchangeCalendarCredential
  | FeishuCalendarCredential
  | LarkCalendarCredential
  | ZohoCalendarCredential
  | ICSFeedCalendarCredential;
```

No `Record<string, unknown>`, no `as` casts. The factory narrows the union at one place:

```
GoogleCalendar: credential.key is missing required field "access_token" (credentialId=123)
```

## Error Handling

One error class for all providers:

```typescript
import { CalendarAdapterError } from "@calcom/calendar-adapter/lib/CalendarAdapterError";

try {
  await adapter.createEvent(event);
} catch (err) {
  if (err instanceof CalendarAdapterError) {
    err.provider;    // "GoogleCalendar"
    err.status;      // 401
    err.transient;   // false — don't retry
  }
}
```

Transient errors (5xx, 429) are retried automatically for providers that use fetch.

## Delegation Credentials

Transparent to the adapter. The service layer resolves authentication:

```typescript
const adapter = createCalendarAdapter("google_calendar",
  isDelegation ? serviceAccountCredential : userCredential
);
```

With delegation, `fetchBusyTimes` accepts calendars from multiple users in a single call — **50x fewer API calls** for enterprise orgs.

## Recurring Events

| Strategy | Providers | How |
|----------|-----------|-----|
| Server-side | Google, Office 365, Exchange, Feishu, Lark, Zoho | freebusy/getSchedule APIs return expanded slots |
| Client-side | CalDAV, Apple, ICS Feed | `expandVEventsFromICal()` via ical.js — centralized, not copy-pasted |

## Internals

These are implementation details. Consumers don't need to read past this point.

### Architecture

```
packages/infra/adapters/calendar/
  src/
    CalendarAdapter.ts           # Interface
    CalendarAdapterTypes.ts      # Shared types
    createCalendarAdapter.ts     # Factory (auto-registers all providers)
    NoOpCalendarAdapter.ts       # Null-object pattern
    adapters/                    # One file per provider
    lib/                         # Shared helpers (error, retry, validation, RRULE)
```

### Inheritance

```
CalendarAdapter (interface)
+-- GoogleCalendarAdapter
+-- Office365CalendarAdapter
+-- CalDAVCalendarAdapter
|   +-- AppleCalendarAdapter
|   +-- ProtonCalendarAdapter
+-- ExchangeCalendarAdapter
+-- BaseByteDanceCalendarAdapter (abstract)
|   +-- FeishuCalendarAdapter
|   +-- LarkCalendarAdapter
+-- ZohoCalendarAdapter
+-- ICSFeedCalendarAdapter
+-- NoOpCalendarAdapter
```

### Relationship to Other Packages

```
packages/infra/adapters/
  calendar/   <- this package (CRUD, availability, sync, subscriptions)
  video/      <- future (Zoom, Google Meet, MS Teams, Daily.co)
  kv/         <- existing (Redis, Upstash, Memory)
```

The **calendar cache** is a decorator that wraps any `CalendarAdapter`, not an adapter itself. **Webhook handling** (inbound) is a service-layer concern — the adapter only handles outbound operations.

### Tests

```bash
TZ=UTC yarn vitest run packages/infra/adapters/calendar/src/__tests__/
```
