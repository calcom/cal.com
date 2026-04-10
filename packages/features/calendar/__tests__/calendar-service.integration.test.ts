/**
 * Integration tests for CalendarService.
 *
 * Wires the REAL CalendarService, CalendarCacheService, and CalendarSyncService
 * with in-memory fake repositories and a configurable fake adapter. No vi.fn()
 * mocks — every dependency maintains real state in Maps/arrays so we can assert
 * on the final repository state after each scenario.
 */
import type { CalendarAdapter } from "@calcom/calendar-adapter/calendar-adapter";
import type {
  BusyTimeslot,
  CalendarEvent,
  CalendarEventInput,
  CalendarEventResult,
  CalendarInfo,
  FetchBusyTimesInput,
  FetchEventsInput,
  FetchEventsResult,
  HealthCheckResult,
  SubscribeInput,
  SubscribeResult,
  UnsubscribeInput,
} from "@calcom/calendar-adapter/calendar-adapter-types";
import { CalendarAdapterError } from "@calcom/calendar-adapter/lib/calendar-adapter-error";
import type { CalendarCacheEventRepository } from "@calcom/features/calendar/repositories/calendar-cache-event-repository";
import type { CredentialRepository } from "@calcom/features/calendar/repositories/credential-repository";
import type { SelectedCalendarRepository } from "@calcom/features/calendar/repositories/selected-calendar-repository";
import { CalendarCacheService } from "@calcom/features/calendar/services/calendar-cache-service";
import { CalendarSyncService } from "@calcom/features/calendar/services/calendar-sync-service";
import type { CalendarCredential } from "@calcom/features/calendar/types";
import type { CalendarCacheEvent, Prisma, SelectedCalendar } from "@calcom/prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CalendarService } from "../services/calendar-service";

// ---------------------------------------------------------------------------
// Module mocks — bypass real adapter construction
// ---------------------------------------------------------------------------

let _fakeAdapter: CalendarAdapter;

vi.mock("@calcom/calendar-adapter/create-calendar-adapter", () => ({
  createCalendarAdapter: () => _fakeAdapter,
}));

// ---------------------------------------------------------------------------
// Fake SelectedCalendar factory
// ---------------------------------------------------------------------------

let _idCounter = 0;

function makeSelectedCalendar(overrides: Partial<SelectedCalendar> = {}): SelectedCalendar {
  _idCounter++;
  return {
    id: `sc-${_idCounter}`,
    userId: 1,
    credentialId: 100,
    integration: "google_calendar",
    externalId: `calendar-${_idCounter}@example.com`,
    eventTypeId: null,
    delegationCredentialId: null,
    domainWideDelegationCredentialId: null,
    googleChannelId: null,
    googleChannelKind: null,
    googleChannelResourceId: null,
    googleChannelResourceUri: null,
    googleChannelExpiration: null,
    error: null,
    lastErrorAt: null,
    watchAttempts: 0,
    unwatchAttempts: 0,
    maxAttempts: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    channelId: null,
    channelKind: null,
    channelResourceId: null,
    channelResourceUri: null,
    channelExpiration: null,
    syncSubscribedAt: null,
    syncSubscribedErrorAt: null,
    syncSubscribedErrorCount: 0,
    syncToken: null,
    syncedAt: null,
    syncErrorAt: null,
    syncErrorCount: 0,
    ...overrides,
  } as SelectedCalendar;
}

// ---------------------------------------------------------------------------
// In-memory fake: SelectedCalendarRepository
// ---------------------------------------------------------------------------

class InMemorySelectedCalendarRepository implements SelectedCalendarRepository {
  private calendars = new Map<string, SelectedCalendar>();

  seed(cal: SelectedCalendar): void {
    this.calendars.set(cal.id, { ...cal });
  }

  get(id: string): SelectedCalendar | undefined {
    return this.calendars.get(id);
  }

  async findById(id: string) {
    return this.calendars.get(id) ?? null;
  }

  async findByChannelId(channelId: string) {
    for (const cal of this.calendars.values()) {
      if (cal.channelId === channelId) return cal;
    }
    return null;
  }

  async findNextSubscriptionBatch(params: { take: number; integrations: string[] }) {
    const results: SelectedCalendar[] = [];
    for (const cal of this.calendars.values()) {
      if (params.integrations.includes(cal.integration) && !cal.syncSubscribedAt) {
        results.push(cal);
        if (results.length >= params.take) break;
      }
    }
    return results;
  }

  async updateSyncStatus(
    id: string,
    data: Pick<
      Prisma.SelectedCalendarUpdateInput,
      "syncToken" | "syncedAt" | "syncErrorAt" | "syncErrorCount"
    >
  ) {
    const cal = this.calendars.get(id);
    if (!cal) throw new Error(`Calendar ${id} not found`);

    if (data.syncToken !== undefined) cal.syncToken = data.syncToken as string | null;
    if (data.syncedAt !== undefined) cal.syncedAt = data.syncedAt as Date | null;
    if (data.syncErrorAt !== undefined) cal.syncErrorAt = data.syncErrorAt as Date | null;

    if (data.syncErrorCount !== undefined) {
      if (typeof data.syncErrorCount === "number") {
        cal.syncErrorCount = data.syncErrorCount;
      } else if (
        typeof data.syncErrorCount === "object" &&
        data.syncErrorCount !== null &&
        "increment" in data.syncErrorCount
      ) {
        cal.syncErrorCount = (cal.syncErrorCount ?? 0) + (data.syncErrorCount.increment as number);
      }
    }

    cal.updatedAt = new Date();
    this.calendars.set(id, cal);
    return cal;
  }

  async updateSubscription(
    id: string,
    data: Pick<
      Prisma.SelectedCalendarUpdateInput,
      | "channelId"
      | "channelResourceId"
      | "channelResourceUri"
      | "channelKind"
      | "channelExpiration"
      | "syncSubscribedAt"
      | "syncSubscribedErrorAt"
      | "syncSubscribedErrorCount"
    >
  ) {
    const cal = this.calendars.get(id);
    if (!cal) throw new Error(`Calendar ${id} not found`);

    if (data.channelId !== undefined) cal.channelId = data.channelId as string | null;
    if (data.channelResourceId !== undefined) cal.channelResourceId = data.channelResourceId as string | null;
    if (data.channelResourceUri !== undefined)
      cal.channelResourceUri = data.channelResourceUri as string | null;
    if (data.channelKind !== undefined) cal.channelKind = data.channelKind as string | null;
    if (data.channelExpiration !== undefined) cal.channelExpiration = data.channelExpiration as Date | null;
    if (data.syncSubscribedAt !== undefined) cal.syncSubscribedAt = data.syncSubscribedAt as Date | null;
    if (data.syncSubscribedErrorAt !== undefined)
      cal.syncSubscribedErrorAt = data.syncSubscribedErrorAt as Date | null;
    if (data.syncSubscribedErrorCount !== undefined)
      cal.syncSubscribedErrorCount = data.syncSubscribedErrorCount as number;

    cal.updatedAt = new Date();
    this.calendars.set(id, cal);
    return cal;
  }

  async clearUnsubscribeState(id: string) {
    const cal = this.calendars.get(id);
    if (!cal) throw new Error(`Calendar ${id} not found`);

    // Atomically clear channel metadata + sync state (mirrors Prisma $transaction)
    cal.channelId = null;
    cal.channelResourceId = null;
    cal.channelResourceUri = null;
    cal.channelExpiration = null;
    cal.syncSubscribedAt = null;
    cal.syncToken = null;
    cal.syncedAt = null;
    cal.syncErrorAt = null;
    cal.syncErrorCount = 0;
    cal.updatedAt = new Date();
    this.calendars.set(id, cal);
  }

  async updateLastWebhookReceivedAt(id: string) {
    const cal = this.calendars.get(id);
    if (!cal) throw new Error(`Calendar ${id} not found`);
    cal.updatedAt = new Date();
    this.calendars.set(id, cal);
  }

  async findStaleSubscribed(_staleDays: number) {
    return [];
  }
}

// ---------------------------------------------------------------------------
// In-memory fake: CalendarCacheEventRepository
// ---------------------------------------------------------------------------

class InMemoryCalendarCacheEventRepository implements CalendarCacheEventRepository {
  events: Partial<CalendarCacheEvent>[] = [];

  async upsertMany(events: Partial<CalendarCacheEvent>[]): Promise<void> {
    for (const event of events) {
      const idx = this.events.findIndex(
        (e) => e.externalId === event.externalId && e.selectedCalendarId === event.selectedCalendarId
      );
      if (idx >= 0) {
        this.events[idx] = { ...this.events[idx], ...event };
      } else {
        this.events.push({ ...event, id: `cce-${this.events.length + 1}` });
      }
    }
  }

  async deleteMany(events: Pick<CalendarCacheEvent, "externalId" | "selectedCalendarId">[]): Promise<void> {
    for (const target of events) {
      this.events = this.events.filter(
        (e) => !(e.externalId === target.externalId && e.selectedCalendarId === target.selectedCalendarId)
      );
    }
  }

  async deleteAllBySelectedCalendarId(selectedCalendarId: string): Promise<void> {
    this.events = this.events.filter((e) => e.selectedCalendarId !== selectedCalendarId);
  }

  async deleteStale(): Promise<void> {
    // no-op for tests
  }

  async findBusyTimesBetween(
    selectedCalendarIds: string[],
    start: Date,
    end: Date
  ): Promise<Array<{ start: Date; end: Date; timeZone: string | null }>> {
    return this.events
      .filter(
        (e) =>
          e.selectedCalendarId &&
          selectedCalendarIds.includes(e.selectedCalendarId) &&
          e.start &&
          e.end &&
          e.start < end &&
          e.end > start
      )
      .map((e) => ({ start: e.start!, end: e.end!, timeZone: e.timeZone ?? null }));
  }
}

// ---------------------------------------------------------------------------
// In-memory fake: CredentialRepository
// ---------------------------------------------------------------------------

class InMemoryCredentialRepository implements CredentialRepository {
  private credential: CalendarCredential;
  invalidatedIds = new Set<number>();

  constructor(credential: CalendarCredential) {
    this.credential = credential;
  }

  async resolve(_selectedCalendar: SelectedCalendar): Promise<CalendarCredential> {
    return this.credential;
  }

  async invalidate(id: number): Promise<void> {
    this.invalidatedIds.add(id);
  }
}

// ---------------------------------------------------------------------------
// Configurable fake CalendarAdapter
// ---------------------------------------------------------------------------

interface FakeAdapterConfig {
  busyTimes?: BusyTimeslot[];
  events?: CalendarEvent[];
  nextSyncToken?: string;
  fullSyncRequired?: boolean;
  supportsSubscription?: boolean;
  healthCheckValid?: boolean;
  errorOnFetchBusyTimes?: Error | null;
  errorOnFetchEvents?: Error | null;
  errorOnSubscribe?: Error | null;
}

class FakeCalendarAdapter implements CalendarAdapter {
  config: FakeAdapterConfig;
  subscribedCalendars = new Set<string>();
  unsubscribedChannels = new Set<string>();
  fetchBusyTimesCalls: FetchBusyTimesInput[] = [];
  fetchEventsCalls: FetchEventsInput[] = [];

  constructor(config: FakeAdapterConfig = {}) {
    this.config = {
      busyTimes: [],
      events: [],
      nextSyncToken: "sync-token-1",
      fullSyncRequired: false,
      supportsSubscription: true,
      healthCheckValid: true,
      errorOnFetchBusyTimes: null,
      errorOnFetchEvents: null,
      errorOnSubscribe: null,
      ...config,
    };

    if (this.config.supportsSubscription) {
      this.subscribe = this._subscribe.bind(this);
      this.unsubscribe = this._unsubscribe.bind(this);
      this.fetchEvents = this._fetchEvents.bind(this);
    }
  }

  async createEvent(_event: CalendarEventInput, _externalCalendarId?: string): Promise<CalendarEventResult> {
    return { uid: "uid-1", id: "id-1", type: "google_calendar" };
  }

  async updateEvent(
    uid: string,
    _event: CalendarEventInput,
    _externalCalendarId?: string | null
  ): Promise<CalendarEventResult> {
    return { uid, id: uid, type: "google_calendar" };
  }

  async deleteEvent(_uid: string): Promise<void> {
    // no-op
  }

  async fetchBusyTimes(params: FetchBusyTimesInput): Promise<BusyTimeslot[]> {
    this.fetchBusyTimesCalls.push(params);
    if (this.config.errorOnFetchBusyTimes) throw this.config.errorOnFetchBusyTimes;
    return this.config.busyTimes ?? [];
  }

  async listCalendars(): Promise<CalendarInfo[]> {
    return [];
  }

  // Optional methods — assigned in constructor if supportsSubscription
  subscribe?: (input: SubscribeInput) => Promise<SubscribeResult>;
  unsubscribe?: (input: UnsubscribeInput) => Promise<void>;
  fetchEvents?: (params: FetchEventsInput) => Promise<FetchEventsResult>;
  healthCheck?: () => Promise<HealthCheckResult>;

  private async _subscribe(input: SubscribeInput): Promise<SubscribeResult> {
    if (this.config.errorOnSubscribe) throw this.config.errorOnSubscribe;
    this.subscribedCalendars.add(input.calendarId);
    return {
      channelId: `channel-${input.calendarId}`,
      resourceId: `resource-${input.calendarId}`,
      resourceUri: `https://provider/channels/${input.calendarId}`,
      expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  }

  private async _unsubscribe(input: UnsubscribeInput): Promise<void> {
    this.unsubscribedChannels.add(input.channelId);
  }

  private async _fetchEvents(params: FetchEventsInput): Promise<FetchEventsResult> {
    this.fetchEventsCalls.push(params);
    if (this.config.errorOnFetchEvents) throw this.config.errorOnFetchEvents;
    return {
      events: this.config.events ?? [],
      nextSyncToken: this.config.nextSyncToken ?? "sync-token-1",
      fullSyncRequired: this.config.fullSyncRequired ?? false,
    };
  }

  enableHealthCheck(): void {
    this.healthCheck = async () => ({
      valid: this.config.healthCheckValid ?? true,
      ...(this.config.healthCheckValid === false ? { reason: "invalid_grant" as const } : {}),
    });
  }
}

// ---------------------------------------------------------------------------
// Test harness builder
// ---------------------------------------------------------------------------

interface TestHarness {
  service: CalendarService;
  adapter: FakeCalendarAdapter;
  calendarRepo: InMemorySelectedCalendarRepository;
  cacheRepo: InMemoryCalendarCacheEventRepository;
  credentialRepo: InMemoryCredentialRepository;
  cacheService: CalendarCacheService;
  syncService: CalendarSyncService;
}

function createHarness(adapterConfig?: FakeAdapterConfig): TestHarness {
  const adapter = new FakeCalendarAdapter(adapterConfig);
  _fakeAdapter = adapter;

  const calendarRepo = new InMemorySelectedCalendarRepository();
  const cacheRepo = new InMemoryCalendarCacheEventRepository();

  const credential: CalendarCredential = {
    id: 100,
    type: "google_calendar",
    key: { access_token: "fake-token" },
  };

  const credentialRepo = new InMemoryCredentialRepository(credential);

  const cacheService = new CalendarCacheService({
    cacheRepo,
    config: { staleSyncThresholdMs: 7 * 24 * 60 * 60 * 1000 },
  });

  const syncService = new CalendarSyncService();

  const service = new CalendarService({
    selectedCalendarRepo: calendarRepo,
    credentialRepo,
    cacheService,
    syncService,
    config: {
      circuitBreakerThreshold: 3,
      circuitBreakerCooldownMs: 5 * 60 * 1000,
      webhookBaseUrl: "https://app.cal.dev",
      maxSubscribeErrors: 3,
      maxSyncErrors: 3,
    },
  });

  return { service, adapter, calendarRepo, cacheRepo, credentialRepo, cacheService, syncService };
}

// ---------------------------------------------------------------------------
// Helper: make CalendarEvent
// ---------------------------------------------------------------------------

function makeCalendarEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    uid: "evt-1",
    title: "Team Meeting",
    description: "Standup",
    location: null,
    start: new Date("2026-03-25T10:00:00Z"),
    end: new Date("2026-03-25T11:00:00Z"),
    isAllDay: false,
    status: "confirmed",
    timeZone: "UTC",
    iCalUID: "evt-1@provider.com",
    etag: '"etag-1"',
    recurringEventId: null,
    originalStartTime: null,
    ...overrides,
  } as CalendarEvent;
}

// ===========================================================================
// Scenarios
// ===========================================================================

describe("CalendarService — integration", () => {
  beforeEach(() => {
    _idCounter = 0;
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Full subscription lifecycle
  // -------------------------------------------------------------------------
  describe("Scenario 1: Full subscription lifecycle", () => {
    test("subscribe → adapter.subscribe → events cached → syncToken saved", async () => {
      const events = [
        makeCalendarEvent({ uid: "evt-1", status: "confirmed" }),
        makeCalendarEvent({
          uid: "evt-2",
          status: "confirmed",
          start: new Date("2026-03-25T14:00:00Z"),
          end: new Date("2026-03-25T15:00:00Z"),
        }),
      ];

      const h = createHarness({ events, nextSyncToken: "token-after-first-sync" });
      const cal = makeSelectedCalendar({ id: "sc-sub-1", externalId: "cal@example.com" });
      h.calendarRepo.seed(cal);

      await h.service.subscribe("sc-sub-1");

      // Adapter.subscribe was called
      expect(h.adapter.subscribedCalendars.has("cal@example.com")).toBe(true);

      // Subscription metadata saved
      const updated = h.calendarRepo.get("sc-sub-1")!;
      expect(updated.channelId).toBe("channel-cal@example.com");
      expect(updated.channelResourceId).toBe("resource-cal@example.com");
      expect(updated.syncSubscribedAt).toBeInstanceOf(Date);
      expect(updated.syncSubscribedErrorCount).toBe(0);

      // syncToken persisted
      expect(updated.syncToken).toBe("token-after-first-sync");
      expect(updated.syncedAt).toBeInstanceOf(Date);

      // Events cached (both confirmed → both upserted)
      expect(h.cacheRepo.events).toHaveLength(2);
      expect(h.cacheRepo.events.map((e) => e.externalId).sort()).toEqual(["evt-1", "evt-2"]);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Webhook → cache update → availability served from cache
  // -------------------------------------------------------------------------
  describe("Scenario 2: Webhook → cache → fetchBusyTimes from cache", () => {
    test("fetchBusyTimes serves from cache for synced calendars, adapter NOT called", async () => {
      const busyStart = new Date("2026-03-25T10:00:00Z");
      const busyEnd = new Date("2026-03-25T11:00:00Z");

      const initialEvents = [makeCalendarEvent({ uid: "evt-1", start: busyStart, end: busyEnd })];

      const h = createHarness({
        events: initialEvents,
        nextSyncToken: "token-1",
        busyTimes: [{ start: busyStart, end: busyEnd }],
      });

      const cal = makeSelectedCalendar({ id: "sc-cache-1", externalId: "cal@example.com" });
      h.calendarRepo.seed(cal);

      // Step 1: subscribe → events cached
      await h.service.subscribe("sc-cache-1");
      expect(h.cacheRepo.events).toHaveLength(1);

      // Step 2: processWebhook → new events
      const newEvent = makeCalendarEvent({
        uid: "evt-2",
        start: new Date("2026-03-25T14:00:00Z"),
        end: new Date("2026-03-25T15:00:00Z"),
      });
      h.adapter.config.events = [newEvent];
      h.adapter.config.nextSyncToken = "token-2";

      const calAfterSub = h.calendarRepo.get("sc-cache-1")!;
      await h.service.processWebhook("google_calendar", calAfterSub.channelId!);

      expect(h.cacheRepo.events).toHaveLength(2);

      // Step 3: fetchBusyTimes — should hit cache for this synced calendar
      h.adapter.fetchBusyTimesCalls = [];

      const credential: CalendarCredential = {
        id: 100,
        type: "google_calendar",
        key: { access_token: "tok" },
      };
      const calForBusy = h.calendarRepo.get("sc-cache-1")!;

      const result = await h.service.fetchBusyTimes({
        credentials: [credential],
        dateFrom: "2026-03-25T00:00:00Z",
        dateTo: "2026-03-26T00:00:00Z",
        selectedCalendars: [calForBusy],
      });

      // Adapter.fetchBusyTimes should NOT have been called (served from cache)
      expect(h.adapter.fetchBusyTimesCalls).toHaveLength(0);
      // We should get busy times from cache
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Auth error → credential invalidation → circuit breaker
  // -------------------------------------------------------------------------
  describe("Scenario 3: Auth error → credential invalidation → circuit breaker", () => {
    test("401 error invalidates credential and opens circuit breaker", async () => {
      const authError = new CalendarAdapterError({
        provider: "google_calendar",
        message: "Invalid credentials",
        status: 401,
        transient: false,
      });

      const h = createHarness({ busyTimes: [] });

      const credential: CalendarCredential = {
        id: 200,
        type: "google_calendar",
        key: { access_token: "bad-tok" },
      };

      const cal = makeSelectedCalendar({
        id: "sc-auth-1",
        credentialId: 200,
        externalId: "auth@example.com",
      });
      h.calendarRepo.seed(cal);

      // First call: adapter throws 401
      h.adapter.config.errorOnFetchBusyTimes = authError;

      // Call fetchBusyTimes 3 times to trip the circuit breaker (threshold=3)
      for (let i = 0; i < 3; i++) {
        await h.service.fetchBusyTimes({
          credentials: [credential],
          dateFrom: "2026-03-25T00:00:00Z",
          dateTo: "2026-03-26T00:00:00Z",
          selectedCalendars: [h.calendarRepo.get("sc-auth-1")!],
        });
      }

      // Credential should be invalidated
      expect(h.credentialRepo.invalidatedIds.has(200)).toBe(true);

      // Circuit breaker should be open — 4th call skips credential entirely
      h.adapter.fetchBusyTimesCalls = [];
      await h.service.fetchBusyTimes({
        credentials: [credential],
        dateFrom: "2026-03-25T00:00:00Z",
        dateTo: "2026-03-26T00:00:00Z",
        selectedCalendars: [h.calendarRepo.get("sc-auth-1")!],
      });
      expect(h.adapter.fetchBusyTimesCalls).toHaveLength(0);

      // Other credentials still work
      const goodCredential: CalendarCredential = {
        id: 300,
        type: "google_calendar",
        key: { access_token: "good-tok" },
      };
      const goodCal = makeSelectedCalendar({
        id: "sc-auth-good",
        credentialId: 300,
        externalId: "good@example.com",
      });
      h.calendarRepo.seed(goodCal);

      h.adapter.config.errorOnFetchBusyTimes = null;
      h.adapter.config.busyTimes = [
        { start: new Date("2026-03-25T10:00:00Z"), end: new Date("2026-03-25T11:00:00Z") },
      ];

      const goodResult = await h.service.fetchBusyTimes({
        credentials: [goodCredential],
        dateFrom: "2026-03-25T00:00:00Z",
        dateTo: "2026-03-26T00:00:00Z",
        selectedCalendars: [h.calendarRepo.get("sc-auth-good")!],
      });
      expect(goodResult).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Transient error → retry without damage
  // -------------------------------------------------------------------------
  describe("Scenario 4: Transient error → retry without damage", () => {
    test("503 transient error does NOT increment syncErrorCount or reset syncToken", async () => {
      const transientError = new CalendarAdapterError({
        provider: "google_calendar",
        message: "Service unavailable",
        status: 503,
        transient: true,
      });

      // Subscribe with real events so processEvents saves the syncToken
      const h = createHarness({
        events: [makeCalendarEvent({ uid: "evt-setup" })],
        nextSyncToken: "token-1",
        supportsSubscription: true,
      });

      const cal = makeSelectedCalendar({
        id: "sc-transient-1",
        externalId: "transient@example.com",
        syncToken: null,
        syncErrorCount: 0,
      });
      h.calendarRepo.seed(cal);

      // Subscribe → processEvents saves syncToken="token-1"
      await h.service.subscribe("sc-transient-1");
      expect(h.calendarRepo.get("sc-transient-1")!.syncToken).toBe("token-1");

      // Now set the adapter to throw a transient error on fetchEvents
      h.adapter.config.errorOnFetchEvents = transientError;

      const calAfterSub = h.calendarRepo.get("sc-transient-1")!;

      // processEvents encounters transient error but should NOT increment error count
      const result = await h.service.processEvents(calAfterSub);

      // Verify the result shows 0 events (transient error short-circuits)
      expect(result.eventsFetched).toBe(0);

      // syncErrorCount NOT incremented
      const calAfter = h.calendarRepo.get("sc-transient-1")!;
      expect(calAfter.syncErrorCount).toBe(0);
      // syncToken NOT reset — still has the value from the subscribe call
      expect(calAfter.syncToken).toBe("token-1");

      // Now fix the adapter and verify normal processing works
      h.adapter.config.errorOnFetchEvents = null;
      h.adapter.config.events = [makeCalendarEvent({ uid: "evt-retry-1" })];
      h.adapter.config.nextSyncToken = "token-2";

      const retryResult = await h.service.processEvents(h.calendarRepo.get("sc-transient-1")!);
      expect(retryResult.eventsFetched).toBe(1);
      expect(h.calendarRepo.get("sc-transient-1")!.syncToken).toBe("token-2");
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Sync token expiration → full sync
  // -------------------------------------------------------------------------
  describe("Scenario 5: Sync token expiration → full sync", () => {
    test("non-throwing 410 (fullSyncRequired: true) clears syncToken immediately", async () => {
      const h = createHarness({
        events: [makeCalendarEvent({ uid: "evt-initial" })],
        nextSyncToken: "token-1",
      });

      const cal = makeSelectedCalendar({
        id: "sc-full-sync",
        externalId: "fullsync@example.com",
        syncToken: "old-token",
        syncErrorCount: 0,
      });
      h.calendarRepo.seed(cal);

      // Step 1: initial subscribe
      await h.service.subscribe("sc-full-sync");
      expect(h.calendarRepo.get("sc-full-sync")!.syncToken).toBe("token-1");

      // Step 2: simulate non-throwing 410 — adapter returns fullSyncRequired: true
      // (this is what Google Calendar and Office365 adapters actually do)
      h.adapter.config.fullSyncRequired = true;
      h.adapter.config.events = [];
      h.adapter.config.nextSyncToken = "";

      await h.service.processEvents(h.calendarRepo.get("sc-full-sync")!);

      // syncToken should be cleared to null immediately (no need for maxSyncErrors)
      expect(h.calendarRepo.get("sc-full-sync")!.syncToken).toBeNull();
      expect(h.calendarRepo.get("sc-full-sync")!.syncErrorCount).toBe(0);

      // Step 3: fix adapter — full sync with null syncToken
      h.adapter.config.fullSyncRequired = false;
      h.adapter.config.events = [
        makeCalendarEvent({ uid: "evt-recovered-1" }),
        makeCalendarEvent({
          uid: "evt-recovered-2",
          start: new Date("2026-03-26T10:00:00Z"),
          end: new Date("2026-03-26T11:00:00Z"),
        }),
      ];
      h.adapter.config.nextSyncToken = "fresh-token-2";

      h.adapter.fetchEventsCalls = [];
      await h.service.processEvents(h.calendarRepo.get("sc-full-sync")!);

      // fetchEvents was called with null syncToken (full sync)
      const lastCall = h.adapter.fetchEventsCalls[h.adapter.fetchEventsCalls.length - 1];
      expect(lastCall.syncToken).toBeNull();

      // New token saved
      expect(h.calendarRepo.get("sc-full-sync")!.syncToken).toBe("fresh-token-2");
    });

    test("410 error resets syncToken after maxSyncErrors, enabling full sync", async () => {
      const h = createHarness({
        events: [makeCalendarEvent({ uid: "evt-initial" })],
        nextSyncToken: "token-1",
      });

      const cal = makeSelectedCalendar({
        id: "sc-token-exp",
        externalId: "tokenexp@example.com",
        syncToken: "old-token",
        syncErrorCount: 0,
      });
      h.calendarRepo.seed(cal);

      // Step 1: initial subscribe
      await h.service.subscribe("sc-token-exp");
      expect(h.calendarRepo.get("sc-token-exp")!.syncToken).toBe("token-1");

      // Step 2: simulate 410 (sync token expired)
      const expiredError = new CalendarAdapterError({
        provider: "google_calendar",
        message: "Sync token expired",
        status: 410,
        transient: false,
      });
      h.adapter.config.errorOnFetchEvents = expiredError;

      // processEvents 3 times to reach maxSyncErrors=3
      for (let i = 0; i < 3; i++) {
        try {
          await h.service.processEvents(h.calendarRepo.get("sc-token-exp")!);
        } catch {
          // expected
        }
      }

      // After 3 errors, syncToken should be reset to null
      expect(h.calendarRepo.get("sc-token-exp")!.syncToken).toBeNull();
      expect(h.calendarRepo.get("sc-token-exp")!.syncErrorCount).toBe(0);

      // Step 3: now fix the adapter — full sync (no syncToken)
      h.adapter.config.errorOnFetchEvents = null;
      h.adapter.config.events = [
        makeCalendarEvent({ uid: "evt-full-1" }),
        makeCalendarEvent({
          uid: "evt-full-2",
          start: new Date("2026-03-26T10:00:00Z"),
          end: new Date("2026-03-26T11:00:00Z"),
        }),
      ];
      h.adapter.config.nextSyncToken = "fresh-token";

      h.adapter.fetchEventsCalls = [];
      await h.service.processEvents(h.calendarRepo.get("sc-token-exp")!);

      // fetchEvents was called with null syncToken (full sync)
      const lastCall = h.adapter.fetchEventsCalls[h.adapter.fetchEventsCalls.length - 1];
      expect(lastCall.syncToken).toBeNull();

      // New token saved
      expect(h.calendarRepo.get("sc-token-exp")!.syncToken).toBe("fresh-token");
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 6: Mixed fresh/stale calendars in fetchBusyTimes
  // -------------------------------------------------------------------------
  describe("Scenario 6: Mixed fresh/stale calendars in fetchBusyTimes", () => {
    test("fresh calendar from cache, stale from adapter, results include both", async () => {
      const cachedBusyStart = new Date("2026-03-25T10:00:00Z");
      const cachedBusyEnd = new Date("2026-03-25T11:00:00Z");
      const adapterBusyStart = new Date("2026-03-25T14:00:00Z");
      const adapterBusyEnd = new Date("2026-03-25T15:00:00Z");

      const h = createHarness({
        busyTimes: [{ start: adapterBusyStart, end: adapterBusyEnd }],
      });

      // Calendar A: recently synced (fresh)
      const calA = makeSelectedCalendar({
        id: "sc-fresh",
        credentialId: 100,
        externalId: "fresh@example.com",
        syncedAt: new Date(), // synced just now → fresh
      });
      h.calendarRepo.seed(calA);

      // Pre-populate cache for calendar A
      h.cacheRepo.events.push({
        id: "cce-1",
        selectedCalendarId: "sc-fresh",
        externalId: "cached-evt-1",
        externalEtag: '"etag"',
        start: cachedBusyStart,
        end: cachedBusyEnd,
        isAllDay: false,
        timeZone: "UTC",
        summary: "Cached meeting",
        status: "confirmed" as never,
      });

      // Calendar B: never synced (stale)
      const calB = makeSelectedCalendar({
        id: "sc-stale",
        credentialId: 100,
        externalId: "stale@example.com",
        syncedAt: null, // never synced → stale
      });
      h.calendarRepo.seed(calB);

      const credential: CalendarCredential = {
        id: 100,
        type: "google_calendar",
        key: { access_token: "tok" },
      };

      h.adapter.fetchBusyTimesCalls = [];
      const result = await h.service.fetchBusyTimes({
        credentials: [credential],
        dateFrom: "2026-03-25T00:00:00Z",
        dateTo: "2026-03-26T00:00:00Z",
        selectedCalendars: [h.calendarRepo.get("sc-fresh")!, h.calendarRepo.get("sc-stale")!],
      });

      // Adapter should only be called for stale calendar B
      expect(h.adapter.fetchBusyTimesCalls).toHaveLength(1);
      const adapterCall = h.adapter.fetchBusyTimesCalls[0];
      expect(adapterCall.calendars).toHaveLength(1);
      expect(adapterCall.calendars[0].externalId).toBe("stale@example.com");

      // Results include both cached and adapter events
      expect(result).toHaveLength(2);
      const starts = result.map((r) => r.start.getTime()).sort();
      expect(starts).toEqual([cachedBusyStart.getTime(), adapterBusyStart.getTime()]);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 7: Unsubscribe cleans up everything
  // -------------------------------------------------------------------------
  describe("Scenario 7: Unsubscribe cleans up everything", () => {
    test("unsubscribe → adapter.unsubscribe → cache cleaned → subscription metadata cleared", async () => {
      const h = createHarness({
        events: [makeCalendarEvent({ uid: "evt-unsub-1" })],
        nextSyncToken: "token-1",
      });

      const cal = makeSelectedCalendar({ id: "sc-unsub-1", externalId: "unsub@example.com" });
      h.calendarRepo.seed(cal);

      // Step 1: subscribe
      await h.service.subscribe("sc-unsub-1");

      // Verify state after subscribe
      expect(h.calendarRepo.get("sc-unsub-1")!.channelId).toBeTruthy();
      expect(h.cacheRepo.events.length).toBeGreaterThan(0);
      expect(h.calendarRepo.get("sc-unsub-1")!.syncToken).toBe("token-1");

      // Step 2: unsubscribe
      await h.service.unsubscribe("sc-unsub-1");

      // Adapter.unsubscribe was called
      expect(h.adapter.unsubscribedChannels.has("channel-unsub@example.com")).toBe(true);

      // Cache cleaned
      const remainingEvents = h.cacheRepo.events.filter((e) => e.selectedCalendarId === "sc-unsub-1");
      expect(remainingEvents).toHaveLength(0);

      // All channel metadata and subscription state must be cleared so
      // processWebhook can no longer route webhooks to this calendar.
      const calAfter = h.calendarRepo.get("sc-unsub-1")!;
      expect(calAfter.channelId).toBeNull();
      expect(calAfter.channelResourceId).toBeNull();
      expect(calAfter.syncSubscribedAt).toBeNull();

      // syncedAt and syncToken must be cleared so fetchBusyTimes doesn't serve
      // from the now-empty cache and re-subscription triggers a full sync.
      expect(calAfter.syncedAt).toBeNull();
      expect(calAfter.syncToken).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 8: Cal.com event detection through full pipeline
  // -------------------------------------------------------------------------
  describe("Scenario 8: Cal.com event detection through full pipeline", () => {
    test("cancelled @cal.com event is detected by CalendarSyncService", async () => {
      const calComEvent = makeCalendarEvent({
        uid: "booking-uid-123",
        iCalUID: "booking-uid-123@cal.com",
        status: "cancelled",
      });
      const regularEvent = makeCalendarEvent({
        uid: "ext-evt-1",
        iCalUID: "ext-evt-1@google.com",
        status: "confirmed",
      });

      const h = createHarness({
        events: [calComEvent, regularEvent],
        nextSyncToken: "token-1",
      });

      const cal = makeSelectedCalendar({ id: "sc-calcom-1", externalId: "calcom@example.com" });
      h.calendarRepo.seed(cal);

      await h.service.subscribe("sc-calcom-1");

      // The processEvents result should show 1 event synced (@cal.com)
      // We re-call processEvents to get the result (subscribe calls it internally)
      h.adapter.config.events = [calComEvent, regularEvent];
      h.adapter.config.nextSyncToken = "token-2";

      const result = await h.service.processEvents(h.calendarRepo.get("sc-calcom-1")!);

      expect(result.eventsFetched).toBe(2);
      // eventsSynced counts events with @cal.com iCalUID
      expect(result.eventsSynced).toBe(1);
      // eventsCached counts non-cancelled events
      expect(result.eventsCached).toBe(1);
    });
  });
});
