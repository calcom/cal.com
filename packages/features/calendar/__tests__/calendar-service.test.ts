import type { CalendarAdapter } from "@calcom/calendar-adapter/calendar-adapter";
import type {
  BusyTimeslot,
  CalendarCredential,
  CalendarEvent,
  CalendarEventInput,
  CalendarEventResult,
  CalendarInfo,
  FetchEventsResult,
  HealthCheckResult,
  SubscribeResult,
} from "@calcom/calendar-adapter/calendar-adapter-types";
import { createCalendarAdapter } from "@calcom/calendar-adapter/create-calendar-adapter";
import { CalendarAdapterError } from "@calcom/calendar-adapter/lib/calendar-adapter-error";
import type { CredentialRepository } from "@calcom/features/calendar/repositories/credential-repository";
import type { SelectedCalendarRepository } from "@calcom/features/calendar/repositories/selected-calendar-repository";
import type { CalendarCacheService } from "@calcom/features/calendar/services/calendar-cache-service";
import type { CalendarSyncService } from "@calcom/features/calendar/services/calendar-sync-service";
import type { SelectedCalendar } from "@calcom/prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CalendarService } from "../services/calendar-service";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@calcom/calendar-adapter/create-calendar-adapter", () => ({
  createCalendarAdapter: vi.fn(),
}));

const mockedCreateAdapter = vi.mocked(createCalendarAdapter);

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createMockAdapter(overrides: Partial<CalendarAdapter> = {}): CalendarAdapter {
  return {
    fetchBusyTimes: vi.fn().mockResolvedValue([]),
    createEvent: vi.fn().mockResolvedValue({ uid: "uid-1", id: "id-1", type: "google_calendar" }),
    updateEvent: vi.fn().mockResolvedValue({ uid: "uid-1", id: "id-1", type: "google_calendar" }),
    deleteEvent: vi.fn().mockResolvedValue(undefined),
    listCalendars: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function makeCredential(id: number, type = "google_calendar"): CalendarCredential {
  return {
    id,
    type,
    key: { access_token: `tok-${id}` },
  } as CalendarCredential;
}

function makeSelectedCalendar(
  overrides: Partial<SelectedCalendar> & { credentialId?: number | null; externalId?: string } = {}
): SelectedCalendar {
  return {
    id: overrides.id ?? `sc-${overrides.externalId ?? "1"}`,
    externalId: overrides.externalId ?? "ext-1",
    integration: "google_calendar",
    credentialId: overrides.credentialId ?? 1,
    userId: 1,
    delegationCredentialId: null,
    channelId: null,
    channelResourceId: null,
    channelResourceUri: null,
    channelKind: null,
    channelExpiration: null,
    syncToken: null,
    syncedAt: null,
    syncErrorAt: null,
    syncErrorCount: 0,
    syncSubscribedAt: null,
    syncSubscribedErrorAt: null,
    syncSubscribedErrorCount: 0,
    lastWebhookReceivedAt: null,
    ...overrides,
  } as SelectedCalendar;
}

function makeCalendarEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    uid: "evt-1",
    title: "Meeting",
    start: new Date("2026-03-24T10:00:00Z"),
    end: new Date("2026-03-24T11:00:00Z"),
    status: "confirmed",
    ...overrides,
  };
}

function makeFetchEventsResult(overrides: Partial<FetchEventsResult> = {}): FetchEventsResult {
  return {
    events: [],
    nextSyncToken: "token-next",
    fullSyncRequired: false,
    ...overrides,
  };
}

function makeSubscribeResult(overrides: Partial<SubscribeResult> = {}): SubscribeResult {
  return {
    channelId: "ch-1",
    resourceId: "res-1",
    resourceUri: "https://example.com/resource",
    expiration: new Date("2026-04-24T00:00:00Z"),
    ...overrides,
  };
}

function createMockAdapterWithSubscription(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    ...createMockAdapter(),
    subscribe: vi.fn().mockResolvedValue(makeSubscribeResult()),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    fetchEvents: vi.fn().mockResolvedValue(makeFetchEventsResult()),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

describe("CalendarService", () => {
  let service: CalendarService;
  let mockSelectedCalendarRepo: {
    findById: ReturnType<typeof vi.fn>;
    findByChannelId: ReturnType<typeof vi.fn>;
    findNextSubscriptionBatch: ReturnType<typeof vi.fn>;
    updateSyncStatus: ReturnType<typeof vi.fn>;
    updateSubscription: ReturnType<typeof vi.fn>;
    clearUnsubscribeState: ReturnType<typeof vi.fn>;
    updateLastWebhookReceivedAt: ReturnType<typeof vi.fn>;
    findStaleSubscribed: ReturnType<typeof vi.fn>;
  };
  let mockCacheService: {
    fetchBusyTimesWithCache: ReturnType<typeof vi.fn>;
    fetchFromCache: ReturnType<typeof vi.fn>;
    handleEvents: ReturnType<typeof vi.fn>;
    cleanupCache: ReturnType<typeof vi.fn>;
    cleanupStaleCache: ReturnType<typeof vi.fn>;
  };
  let mockSyncService: {
    handleEvents: ReturnType<typeof vi.fn>;
  };
  let mockCredentialRepo: {
    resolve: ReturnType<typeof vi.fn>;
    invalidate: ReturnType<typeof vi.fn>;
  };
  let mockSubscriptionAdapter: ReturnType<typeof createMockAdapterWithSubscription>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSubscriptionAdapter = createMockAdapterWithSubscription();
    mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

    mockSelectedCalendarRepo = {
      findById: vi.fn().mockResolvedValue(null),
      findByChannelId: vi.fn().mockResolvedValue(null),
      findNextSubscriptionBatch: vi.fn().mockResolvedValue([]),
      updateSyncStatus: vi.fn().mockResolvedValue(makeSelectedCalendar()),
      updateSubscription: vi.fn().mockResolvedValue(makeSelectedCalendar()),
      clearUnsubscribeState: vi.fn().mockResolvedValue(undefined),
      updateLastWebhookReceivedAt: vi.fn().mockResolvedValue(undefined),
      findStaleSubscribed: vi.fn().mockResolvedValue([]),
    };

    mockCacheService = {
      fetchBusyTimesWithCache: vi.fn().mockResolvedValue([]),
      fetchFromCache: vi.fn().mockResolvedValue([]),
      handleEvents: vi.fn().mockResolvedValue(undefined),
      cleanupCache: vi.fn().mockResolvedValue(undefined),
      cleanupStaleCache: vi.fn().mockResolvedValue(undefined),
    };

    mockSyncService = {
      handleEvents: vi
        .fn()
        .mockResolvedValue({ total: 0, synced: 0, cancelled: 0, rescheduled: 0, errors: 0 }),
    };

    mockCredentialRepo = {
      resolve: vi.fn().mockResolvedValue(makeCredential(1)),
      invalidate: vi.fn().mockResolvedValue(undefined),
    };

    service = new CalendarService({
      selectedCalendarRepo: mockSelectedCalendarRepo as unknown as SelectedCalendarRepository,
      cacheService: mockCacheService as unknown as CalendarCacheService,
      syncService: mockSyncService as unknown as CalendarSyncService,
      credentialRepo: mockCredentialRepo as unknown as CredentialRepository,
    });
  });

  // =========================================================================
  // CRUD operations
  // =========================================================================

  describe("createEvent", () => {
    test("returns results array for single calendar", async () => {
      const cred = makeCredential(1);
      const event: CalendarEventInput = {
        title: "Team Sync",
        startTime: new Date("2026-03-24T10:00:00Z"),
        endTime: new Date("2026-03-24T11:00:00Z"),
      };
      const expectedResult: CalendarEventResult = {
        uid: "uid-99",
        id: "id-99",
        type: "google_calendar",
        url: "https://calendar.google.com/event/id-99",
      };

      const adapter = createMockAdapter({
        createEvent: vi.fn().mockResolvedValue(expectedResult),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      const results = await service.createEvent(cred, event, "cal-ext-1");

      expect(results).toEqual([expectedResult]);
      expect(results[0].uid).toBe("uid-99");
      expect(adapter.createEvent).toHaveBeenCalledWith(event, "cal-ext-1");
    });

    test("writes to multiple calendars in parallel", async () => {
      const cred = makeCredential(1);
      const event: CalendarEventInput = {
        title: "Multi-cal Event",
        startTime: new Date("2026-03-24T10:00:00Z"),
        endTime: new Date("2026-03-24T11:00:00Z"),
      };

      const adapter = createMockAdapter({
        createEvent: vi
          .fn()
          .mockResolvedValueOnce({ uid: "uid-1", id: "id-1", type: "google_calendar" })
          .mockResolvedValueOnce({ uid: "uid-2", id: "id-2", type: "google_calendar" }),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      const results = await service.createEvent(cred, event, ["cal-1", "cal-2"]);

      expect(results).toHaveLength(2);
      expect(adapter.createEvent).toHaveBeenCalledTimes(2);
      expect(adapter.createEvent).toHaveBeenCalledWith(event, "cal-1");
      expect(adapter.createEvent).toHaveBeenCalledWith(event, "cal-2");
    });

    test("defaults to 'primary' when no externalCalendarId", async () => {
      const cred = makeCredential(1);
      const event: CalendarEventInput = {
        title: "Default Cal",
        startTime: new Date("2026-03-24T10:00:00Z"),
        endTime: new Date("2026-03-24T11:00:00Z"),
      };

      const adapter = createMockAdapter({
        createEvent: vi.fn().mockResolvedValue({ uid: "uid-1", id: "id-1", type: "google_calendar" }),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      await service.createEvent(cred, event);

      expect(adapter.createEvent).toHaveBeenCalledWith(event, "primary");
    });

    test("returns partial results when some calendars fail", async () => {
      const cred = makeCredential(1);
      const event: CalendarEventInput = {
        title: "Partial Fail",
        startTime: new Date("2026-03-24T10:00:00Z"),
        endTime: new Date("2026-03-24T11:00:00Z"),
      };

      const adapter = createMockAdapter({
        createEvent: vi
          .fn()
          .mockResolvedValueOnce({ uid: "uid-1", id: "id-1", type: "google_calendar" })
          .mockRejectedValueOnce(new Error("Calendar API quota exceeded")),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      const results = await service.createEvent(cred, event, ["cal-ok", "cal-fail"]);

      expect(results).toHaveLength(1);
      expect(results[0].uid).toBe("uid-1");
    });
  });

  describe("updateEvent", () => {
    test("returns results array for single calendar", async () => {
      const cred = makeCredential(1);
      const event: CalendarEventInput = {
        title: "Updated Title",
        startTime: new Date("2026-03-24T14:00:00Z"),
        endTime: new Date("2026-03-24T15:00:00Z"),
      };
      const expectedResult: CalendarEventResult = {
        uid: "uid-updated",
        id: "id-updated",
        type: "google_calendar",
      };

      const adapter = createMockAdapter({
        updateEvent: vi.fn().mockResolvedValue(expectedResult),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      const results = await service.updateEvent(cred, "uid-updated", event, "cal-ext-2");

      expect(results).toEqual([expectedResult]);
      expect(adapter.updateEvent).toHaveBeenCalledWith("uid-updated", event, "cal-ext-2");
    });

    test("writes to multiple calendars in parallel", async () => {
      const cred = makeCredential(1);
      const event: CalendarEventInput = {
        title: "Multi-update",
        startTime: new Date("2026-03-24T14:00:00Z"),
        endTime: new Date("2026-03-24T15:00:00Z"),
      };

      const adapter = createMockAdapter({
        updateEvent: vi
          .fn()
          .mockResolvedValueOnce({ uid: "uid-1", id: "id-1", type: "google_calendar" })
          .mockResolvedValueOnce({ uid: "uid-2", id: "id-2", type: "google_calendar" }),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      const results = await service.updateEvent(cred, "uid-1", event, ["cal-1", "cal-2"]);

      expect(results).toHaveLength(2);
      expect(adapter.updateEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe("deleteEvent", () => {
    test("deletes from single calendar", async () => {
      const cred = makeCredential(1);
      const event: CalendarEventInput = {
        title: "To Delete",
        startTime: new Date("2026-03-24T10:00:00Z"),
        endTime: new Date("2026-03-24T11:00:00Z"),
      };

      const adapter = createMockAdapter({
        deleteEvent: vi.fn().mockResolvedValue(undefined),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      await service.deleteEvent(cred, "uid-del", event, "cal-ext-3");

      expect(adapter.deleteEvent).toHaveBeenCalledWith("uid-del", event, "cal-ext-3");
    });

    test("defaults to 'primary' when no externalCalendarId", async () => {
      const cred = makeCredential(1);
      const adapter = createMockAdapter({
        deleteEvent: vi.fn().mockResolvedValue(undefined),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      await service.deleteEvent(cred, "uid-del");

      expect(adapter.deleteEvent).toHaveBeenCalledWith("uid-del", undefined, "primary");
    });

    test("deletes from multiple calendars in parallel", async () => {
      const cred = makeCredential(1);
      const adapter = createMockAdapter({
        deleteEvent: vi.fn().mockResolvedValue(undefined),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      await service.deleteEvent(cred, "uid-del", undefined, ["cal-1", "cal-2", "cal-3"]);

      expect(adapter.deleteEvent).toHaveBeenCalledTimes(3);
    });

    test("continues deleting other calendars if one fails", async () => {
      const cred = makeCredential(1);
      const adapter = createMockAdapter({
        deleteEvent: vi.fn().mockRejectedValueOnce(new Error("fail")).mockResolvedValueOnce(undefined),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      await service.deleteEvent(cred, "uid-del", undefined, ["cal-fail", "cal-ok"]);

      expect(adapter.deleteEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe("listCalendars", () => {
    test("returns the exact calendar list from the adapter", async () => {
      const cred = makeCredential(1);
      const expectedCalendars: CalendarInfo[] = [
        { externalId: "cal-1", name: "Work", integration: "google_calendar", primary: true },
        { externalId: "cal-2", name: "Personal", integration: "google_calendar", primary: false },
      ];

      const adapter = createMockAdapter({
        listCalendars: vi.fn().mockResolvedValue(expectedCalendars),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      const result = await service.listCalendars(cred);

      expect(result).toEqual(expectedCalendars);
      expect(result).toHaveLength(2);
      expect(result[0].externalId).toBe("cal-1");
      expect(result[0].primary).toBe(true);
      expect(result[1].name).toBe("Personal");
    });
  });

  describe("checkCredentialHealth", () => {
    test("returns the health check result when adapter supports it", async () => {
      const cred = makeCredential(1);
      const expectedResult: HealthCheckResult = { valid: true };

      const adapter = createMockAdapter({
        healthCheck: vi.fn().mockResolvedValue(expectedResult),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      const result = await service.checkCredentialHealth(cred);

      expect(result).toEqual({ valid: true });
    });

    test("returns invalid health with reason from adapter", async () => {
      const cred = makeCredential(1);
      const expectedResult: HealthCheckResult = { valid: false, reason: "invalid_grant" };

      const adapter = createMockAdapter({
        healthCheck: vi.fn().mockResolvedValue(expectedResult),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      const result = await service.checkCredentialHealth(cred);

      expect(result).toEqual({ valid: false, reason: "invalid_grant" });
      expect(result?.valid).toBe(false);
      expect(result?.reason).toBe("invalid_grant");
    });

    test("returns null when adapter has no healthCheck method", async () => {
      const cred = makeCredential(1);

      const adapter = createMockAdapter();
      delete (adapter as Record<string, unknown>).healthCheck;
      mockedCreateAdapter.mockReturnValue(adapter);

      const result = await service.checkCredentialHealth(cred);

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // fetchBusyTimes
  // =========================================================================

  describe("fetchBusyTimes", () => {
    test("aggregates busy times from multiple credentials with correct start/end values", async () => {
      const cred1 = makeCredential(1);
      const cred2 = makeCredential(2);

      const busy1: BusyTimeslot = { start: "2026-03-24T10:00:00Z", end: "2026-03-24T11:00:00Z" };
      const busy2: BusyTimeslot = {
        start: "2026-03-24T14:00:00Z",
        end: "2026-03-24T15:00:00Z",
        timeZone: "America/New_York",
      };

      let callCount = 0;
      mockedCreateAdapter.mockImplementation(() => {
        callCount++;
        return callCount === 1
          ? createMockAdapter({ fetchBusyTimes: vi.fn().mockResolvedValue([busy1]) })
          : createMockAdapter({ fetchBusyTimes: vi.fn().mockResolvedValue([busy2]) });
      });

      const result = await service.fetchBusyTimes({
        credentials: [cred1, cred2],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [
          makeSelectedCalendar({ credentialId: 1, externalId: "cal-a" }),
          makeSelectedCalendar({ credentialId: 2, externalId: "cal-b" }),
        ],
      });

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(busy1);
      expect(result).toContainEqual(busy2);
    });

    test("returns empty array when credentials list is empty", async () => {
      const result = await service.fetchBusyTimes({
        credentials: [],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [makeSelectedCalendar({ credentialId: 1 })],
      });

      expect(result).toEqual([]);
    });

    test("returns empty array when selectedCalendars is empty", async () => {
      const result = await service.fetchBusyTimes({
        credentials: [makeCredential(1)],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [],
      });

      expect(result).toEqual([]);
    });

    test("skips credentials that have no matching selected calendars", async () => {
      const cred1 = makeCredential(1);
      const cred2 = makeCredential(2);

      const busy1: BusyTimeslot = { start: "2026-03-24T10:00:00Z", end: "2026-03-24T11:00:00Z" };
      const adapter = createMockAdapter({ fetchBusyTimes: vi.fn().mockResolvedValue([busy1]) });
      mockedCreateAdapter.mockReturnValue(adapter);

      const result = await service.fetchBusyTimes({
        credentials: [cred1, cred2],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [makeSelectedCalendar({ credentialId: 1, externalId: "cal-a" })],
      });

      expect(result).toEqual([busy1]);
      // Only one adapter call because cred2 has no matching calendars
      expect(adapter.fetchBusyTimes).toHaveBeenCalledTimes(1);
    });

    test("groups calendars by credentialId and sends them in a single adapter call", async () => {
      const cred = makeCredential(10);
      const adapter = createMockAdapter({ fetchBusyTimes: vi.fn().mockResolvedValue([]) });
      mockedCreateAdapter.mockReturnValue(adapter);

      await service.fetchBusyTimes({
        credentials: [cred],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [
          makeSelectedCalendar({ credentialId: 10, externalId: "cal-x" }),
          makeSelectedCalendar({ credentialId: 10, externalId: "cal-y" }),
        ],
      });

      expect(adapter.fetchBusyTimes).toHaveBeenCalledTimes(1);
      const call = vi.mocked(adapter.fetchBusyTimes).mock.calls[0][0];
      expect(call.calendars).toHaveLength(2);
      expect(call.calendars).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ externalId: "cal-x" }),
          expect.objectContaining({ externalId: "cal-y" }),
        ])
      );
    });

    test("falls back to delegationCredentialId when credentialId is null for grouping", async () => {
      // delegationCredentialId is a UUID string while credential.id is an integer.
      // The credential carries delegationCredentialId metadata so the service can
      // match calendars grouped by delegation UUID to the resolved credential.
      const delegationUuid = "550e8400-e29b-41d3-a4c6-526f33f3e7e9";
      const cred = { ...makeCredential(10), delegationCredentialId: delegationUuid };
      const adapter = createMockAdapter({ fetchBusyTimes: vi.fn().mockResolvedValue([]) });
      mockedCreateAdapter.mockReturnValue(adapter);

      await service.fetchBusyTimes({
        credentials: [cred],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [
          makeSelectedCalendar({
            credentialId: null,
            delegationCredentialId: delegationUuid,
            externalId: "cal-x",
          }),
          makeSelectedCalendar({
            credentialId: null,
            delegationCredentialId: delegationUuid,
            externalId: "cal-y",
          }),
        ],
      });

      expect(adapter.fetchBusyTimes).toHaveBeenCalledTimes(1);
      const call = vi.mocked(adapter.fetchBusyTimes).mock.calls[0][0];
      expect(call.calendars).toHaveLength(2);
    });

    test("skips calendars where both credentialId and delegationCredentialId are null", async () => {
      const cred = makeCredential(1);
      const adapter = createMockAdapter({ fetchBusyTimes: vi.fn().mockResolvedValue([]) });
      mockedCreateAdapter.mockReturnValue(adapter);

      await service.fetchBusyTimes({
        credentials: [cred],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [
          makeSelectedCalendar({ credentialId: null, delegationCredentialId: null, externalId: "orphan" }),
          makeSelectedCalendar({ credentialId: 1, externalId: "cal-a" }),
        ],
      });

      expect(adapter.fetchBusyTimes).toHaveBeenCalledTimes(1);
      const call = vi.mocked(adapter.fetchBusyTimes).mock.calls[0][0];
      expect(call.calendars).toHaveLength(1);
      expect(call.calendars[0].externalId).toBe("cal-a");
    });

    test("expands date range by 11 hours before and 14 hours after", async () => {
      const cred = makeCredential(1);
      const adapter = createMockAdapter();
      mockedCreateAdapter.mockReturnValue(adapter);

      const dateFrom = "2026-03-24T00:00:00Z";
      const dateTo = "2026-03-25T00:00:00Z";

      await service.fetchBusyTimes({
        credentials: [cred],
        dateFrom,
        dateTo,
        selectedCalendars: [makeSelectedCalendar({ credentialId: 1, externalId: "cal-a" })],
      });

      const call = vi.mocked(adapter.fetchBusyTimes).mock.calls[0][0];
      const expandedFrom = new Date(call.dateFrom);
      const expandedTo = new Date(call.dateTo);
      const originalFrom = new Date(dateFrom);
      const originalTo = new Date(dateTo);

      expect(expandedFrom.getTime()).toBe(originalFrom.getTime() - 11 * 60 * 60 * 1000);
      expect(expandedTo.getTime()).toBe(originalTo.getTime() + 14 * 60 * 60 * 1000);
      expect(expandedFrom.toISOString()).toBe("2026-03-23T13:00:00.000Z");
      expect(expandedTo.toISOString()).toBe("2026-03-25T14:00:00.000Z");
    });

    test("uses custom expansion hours from config", async () => {
      const customService = new CalendarService({
        selectedCalendarRepo: mockSelectedCalendarRepo as unknown as SelectedCalendarRepository,
        cacheService: mockCacheService as unknown as CalendarCacheService,
        syncService: mockSyncService as unknown as CalendarSyncService,
        credentialRepo: mockCredentialRepo as unknown as CredentialRepository,
        config: { hoursBeforeExpansion: 5, hoursAfterExpansion: 3 },
      });

      const adapter = createMockAdapter();
      mockedCreateAdapter.mockReturnValue(adapter);

      await customService.fetchBusyTimes({
        credentials: [makeCredential(1)],
        dateFrom: "2026-03-24T12:00:00Z",
        dateTo: "2026-03-24T18:00:00Z",
        selectedCalendars: [makeSelectedCalendar({ credentialId: 1, externalId: "cal-a" })],
      });

      const call = vi.mocked(adapter.fetchBusyTimes).mock.calls[0][0];
      const expandedFrom = new Date(call.dateFrom);
      const expandedTo = new Date(call.dateTo);

      expect(expandedFrom.toISOString()).toBe("2026-03-24T07:00:00.000Z");
      expect(expandedTo.toISOString()).toBe("2026-03-24T21:00:00.000Z");
    });

    test("adapter failure for one credential does not block results from other credentials", async () => {
      const busy: BusyTimeslot = { start: "2026-03-24T10:00:00Z", end: "2026-03-24T11:00:00Z" };

      let callCount = 0;
      mockedCreateAdapter.mockImplementation(() => {
        callCount++;
        return callCount === 1
          ? createMockAdapter({ fetchBusyTimes: vi.fn().mockRejectedValue(new Error("Network error")) })
          : createMockAdapter({ fetchBusyTimes: vi.fn().mockResolvedValue([busy]) });
      });

      const result = await service.fetchBusyTimes({
        credentials: [makeCredential(1), makeCredential(2)],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [
          makeSelectedCalendar({ credentialId: 1, externalId: "cal-a" }),
          makeSelectedCalendar({ credentialId: 2, externalId: "cal-b" }),
        ],
      });

      expect(result).toEqual([busy]);
    });

    test("records failure in circuit breaker when adapter throws", async () => {
      const adapter = createMockAdapter({
        fetchBusyTimes: vi.fn().mockRejectedValue(new Error("Fail")),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      await service.fetchBusyTimes({
        credentials: [makeCredential(1)],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [makeSelectedCalendar({ credentialId: 1, externalId: "cal-a" })],
      });

      // Second call should still work (only 1 failure, threshold is 3)
      const adapter2 = createMockAdapter({
        fetchBusyTimes: vi.fn().mockResolvedValue([{ start: "s", end: "e" }]),
      });
      mockedCreateAdapter.mockReturnValue(adapter2);

      const result = await service.fetchBusyTimes({
        credentials: [makeCredential(1)],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [makeSelectedCalendar({ credentialId: 1, externalId: "cal-a" })],
      });

      expect(result).toHaveLength(1);
    });

    test("clears circuit breaker on successful adapter call", async () => {
      const failAdapter = createMockAdapter({
        fetchBusyTimes: vi.fn().mockRejectedValue(new Error("Fail")),
      });
      mockedCreateAdapter.mockReturnValue(failAdapter);

      const params = {
        credentials: [makeCredential(1)],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [makeSelectedCalendar({ credentialId: 1, externalId: "cal-a" })],
      };

      // 2 failures
      await service.fetchBusyTimes(params);
      await service.fetchBusyTimes(params);

      // Now succeed — should clear circuit breaker
      const successAdapter = createMockAdapter({
        fetchBusyTimes: vi.fn().mockResolvedValue([]),
      });
      mockedCreateAdapter.mockReturnValue(successAdapter);
      await service.fetchBusyTimes(params);

      // Fail again — circuit breaker should be reset, so this counts as failure 1
      const failAgainAdapter = createMockAdapter({
        fetchBusyTimes: vi.fn().mockRejectedValue(new Error("Fail again")),
      });
      mockedCreateAdapter.mockReturnValue(failAgainAdapter);

      await service.fetchBusyTimes(params);
      await service.fetchBusyTimes(params);

      // 2 failures after reset — circuit should still be closed (threshold = 3)
      const checkAdapter = createMockAdapter({
        fetchBusyTimes: vi.fn().mockResolvedValue([{ start: "s", end: "e" } as BusyTimeslot]),
      });
      mockedCreateAdapter.mockReturnValue(checkAdapter);
      const result = await service.fetchBusyTimes(params);

      expect(result).toHaveLength(1);
      expect(checkAdapter.fetchBusyTimes).toHaveBeenCalledTimes(1);
    });

    test("maps adapter calendars with externalId, integration, and credentialId", async () => {
      const adapter = createMockAdapter();
      mockedCreateAdapter.mockReturnValue(adapter);

      const cal = makeSelectedCalendar({
        credentialId: 5,
        externalId: "my-cal",
        integration: "office365_calendar",
      });

      await service.fetchBusyTimes({
        credentials: [makeCredential(5)],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [cal],
      });

      const call = vi.mocked(adapter.fetchBusyTimes).mock.calls[0][0];
      expect(call.calendars[0]).toEqual({
        externalId: "my-cal",
        integration: "office365_calendar",
        credentialId: 5,
      });
    });
  });

  // =========================================================================
  // Cache-aware availability
  // =========================================================================

  describe("cache-aware availability", () => {
    test("routes fresh-synced calendars to cache and unsynced to adapter", async () => {
      const cred = makeCredential(1);
      const cachedBusy = [
        { start: new Date("2026-03-24T09:00:00Z"), end: new Date("2026-03-24T10:00:00Z"), timeZone: "UTC" },
      ];
      mockCacheService.fetchFromCache.mockResolvedValue(cachedBusy);

      const adapterBusy: BusyTimeslot[] = [{ start: "2026-03-24T14:00:00Z", end: "2026-03-24T15:00:00Z" }];
      const adapter = createMockAdapter({ fetchBusyTimes: vi.fn().mockResolvedValue(adapterBusy) });
      mockedCreateAdapter.mockReturnValue(adapter);

      const syncedCal = makeSelectedCalendar({
        credentialId: 1,
        externalId: "cal-synced",
        syncedAt: new Date(), // fresh — within staleSyncThresholdMs
      });
      const unsyncedCal = makeSelectedCalendar({
        credentialId: 1,
        externalId: "cal-unsynced",
        syncedAt: null,
      });

      const result = await service.fetchBusyTimes({
        credentials: [cred],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [syncedCal, unsyncedCal],
      });

      expect(mockCacheService.fetchFromCache).toHaveBeenCalledTimes(1);
      const cacheCall = mockCacheService.fetchFromCache.mock.calls[0][0];
      expect(cacheCall.selectedCalendarIds).toEqual([syncedCal.id]);

      expect(adapter.fetchBusyTimes).toHaveBeenCalledTimes(1);
      const adapterCall = vi.mocked(adapter.fetchBusyTimes).mock.calls[0][0];
      expect(adapterCall.calendars).toHaveLength(1);
      expect(adapterCall.calendars[0].externalId).toBe("cal-unsynced");

      expect(result).toHaveLength(2);
      // Cached result gets start/end from the cache object
      expect(result[0]).toEqual({
        start: new Date("2026-03-24T09:00:00Z"),
        end: new Date("2026-03-24T10:00:00Z"),
        timeZone: "UTC",
      });
    });

    test("routes stale-synced calendars to adapter path for circuit breaker coverage", async () => {
      const cred = makeCredential(1);
      const adapterBusy: BusyTimeslot[] = [{ start: "2026-03-24T14:00:00Z", end: "2026-03-24T15:00:00Z" }];
      const adapter = createMockAdapter({ fetchBusyTimes: vi.fn().mockResolvedValue(adapterBusy) });
      mockedCreateAdapter.mockReturnValue(adapter);

      // syncedAt is 8 days ago — beyond the default 7-day staleSyncThresholdMs
      const staleCal = makeSelectedCalendar({
        credentialId: 1,
        externalId: "cal-stale",
        syncedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      });

      const result = await service.fetchBusyTimes({
        credentials: [cred],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [staleCal],
      });

      // Stale calendars should NOT be routed to cache
      expect(mockCacheService.fetchFromCache).not.toHaveBeenCalled();
      // Instead they go through the adapter path
      expect(adapter.fetchBusyTimes).toHaveBeenCalledTimes(1);
      expect(result).toEqual(adapterBusy);
    });

    test("preserves timeZone from cached busy times when present", async () => {
      const cred = makeCredential(1);
      const cachedBusy = [
        {
          start: new Date("2026-03-24T09:00:00Z"),
          end: new Date("2026-03-24T10:00:00Z"),
          timeZone: "America/Chicago",
        },
      ];
      mockCacheService.fetchFromCache.mockResolvedValue(cachedBusy);

      const adapter = createMockAdapter();
      mockedCreateAdapter.mockReturnValue(adapter);

      const result = await service.fetchBusyTimes({
        credentials: [cred],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [
          makeSelectedCalendar({ credentialId: 1, externalId: "cal-synced", syncedAt: new Date() }),
        ],
      });

      expect(result[0]).toEqual(expect.objectContaining({ timeZone: "America/Chicago" }));
    });

    test("omits timeZone from result when cached busy time has null timeZone", async () => {
      const cred = makeCredential(1);
      const cachedBusy = [
        { start: new Date("2026-03-24T09:00:00Z"), end: new Date("2026-03-24T10:00:00Z"), timeZone: null },
      ];
      mockCacheService.fetchFromCache.mockResolvedValue(cachedBusy);

      const adapter = createMockAdapter();
      mockedCreateAdapter.mockReturnValue(adapter);

      const result = await service.fetchBusyTimes({
        credentials: [cred],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [
          makeSelectedCalendar({ credentialId: 1, externalId: "cal-synced", syncedAt: new Date() }),
        ],
      });

      expect(result[0]).not.toHaveProperty("timeZone");
      expect(result[0]).toEqual({
        start: new Date("2026-03-24T09:00:00Z"),
        end: new Date("2026-03-24T10:00:00Z"),
      });
    });

    test("moves fresh-cached calendars to adapter path when cache fetch fails", async () => {
      const cred = makeCredential(1);
      mockCacheService.fetchFromCache.mockRejectedValue(new Error("Cache down"));

      const adapterBusy: BusyTimeslot[] = [{ start: "2026-03-24T14:00:00Z", end: "2026-03-24T15:00:00Z" }];
      const adapter = createMockAdapter({ fetchBusyTimes: vi.fn().mockResolvedValue(adapterBusy) });
      mockedCreateAdapter.mockReturnValue(adapter);

      const syncedCal = makeSelectedCalendar({
        credentialId: 1,
        externalId: "cal-synced",
        syncedAt: new Date(),
      });

      const result = await service.fetchBusyTimes({
        credentials: [cred],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [syncedCal],
      });

      expect(adapter.fetchBusyTimes).toHaveBeenCalledTimes(1);
      const call = vi.mocked(adapter.fetchBusyTimes).mock.calls[0][0];
      expect(call.calendars).toHaveLength(1);
      expect(call.calendars[0].externalId).toBe("cal-synced");
      expect(result).toEqual(adapterBusy);
    });

    test("cache failure moves fresh calendars to adapter alongside already-unsynced calendars", async () => {
      const cred = makeCredential(1);
      mockCacheService.fetchFromCache.mockRejectedValue(new Error("Cache crash"));

      const adapter = createMockAdapter({ fetchBusyTimes: vi.fn().mockResolvedValue([]) });
      mockedCreateAdapter.mockReturnValue(adapter);

      const syncedCal = makeSelectedCalendar({
        credentialId: 1,
        externalId: "cal-synced",
        syncedAt: new Date(),
      });
      const unsyncedCal = makeSelectedCalendar({
        credentialId: 1,
        externalId: "cal-unsynced",
        syncedAt: null,
      });

      await service.fetchBusyTimes({
        credentials: [cred],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [syncedCal, unsyncedCal],
      });

      expect(adapter.fetchBusyTimes).toHaveBeenCalledTimes(1);
      const call = vi.mocked(adapter.fetchBusyTimes).mock.calls[0][0];
      expect(call.calendars).toHaveLength(2);
      expect(call.calendars.map((c: { externalId: string }) => c.externalId).sort()).toEqual([
        "cal-synced",
        "cal-unsynced",
      ]);
    });
  });

  // =========================================================================
  // Circuit breaker
  // =========================================================================

  describe("circuit breaker", () => {
    const makeParams = (credentialId: number) => ({
      credentials: [makeCredential(credentialId)],
      dateFrom: "2026-03-24T00:00:00Z",
      dateTo: "2026-03-25T00:00:00Z",
      selectedCalendars: [makeSelectedCalendar({ credentialId, externalId: `cal-${credentialId}` })],
    });

    test("opens after exactly 3 consecutive failures (default threshold)", async () => {
      const failAdapter = createMockAdapter({
        fetchBusyTimes: vi.fn().mockRejectedValue(new Error("Fail")),
      });
      mockedCreateAdapter.mockReturnValue(failAdapter);

      const params = makeParams(1);

      await service.fetchBusyTimes(params);
      await service.fetchBusyTimes(params);
      expect(failAdapter.fetchBusyTimes).toHaveBeenCalledTimes(2);

      // 3rd call trips the breaker
      await service.fetchBusyTimes(params);
      expect(failAdapter.fetchBusyTimes).toHaveBeenCalledTimes(3);

      // 4th call should be skipped
      const result = await service.fetchBusyTimes(params);
      expect(failAdapter.fetchBusyTimes).toHaveBeenCalledTimes(3);
      expect(result).toEqual([]);
    });

    test("does NOT open at exactly threshold minus one failures", async () => {
      const failAdapter = createMockAdapter({
        fetchBusyTimes: vi.fn().mockRejectedValue(new Error("Fail")),
      });
      mockedCreateAdapter.mockReturnValue(failAdapter);

      const params = makeParams(1);

      await service.fetchBusyTimes(params);
      await service.fetchBusyTimes(params);

      // 2 failures, threshold is 3 — circuit should still be closed
      // Replace with a success adapter to verify call goes through
      const successAdapter = createMockAdapter({
        fetchBusyTimes: vi.fn().mockResolvedValue([{ start: "s", end: "e" } as BusyTimeslot]),
      });
      mockedCreateAdapter.mockReturnValue(successAdapter);

      const result = await service.fetchBusyTimes(params);
      expect(successAdapter.fetchBusyTimes).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });

    test("resets after cooldown period elapses", async () => {
      const shortCooldownService = new CalendarService({
        selectedCalendarRepo: mockSelectedCalendarRepo as unknown as SelectedCalendarRepository,
        cacheService: mockCacheService as unknown as CalendarCacheService,
        syncService: mockSyncService as unknown as CalendarSyncService,
        credentialRepo: mockCredentialRepo as unknown as CredentialRepository,
        config: { circuitBreakerCooldownMs: 0 },
      });

      const failAdapter = createMockAdapter({
        fetchBusyTimes: vi.fn().mockRejectedValue(new Error("Fail")),
      });
      mockedCreateAdapter.mockReturnValue(failAdapter);

      const params = makeParams(1);

      // Trip the breaker
      await shortCooldownService.fetchBusyTimes(params);
      await shortCooldownService.fetchBusyTimes(params);
      await shortCooldownService.fetchBusyTimes(params);

      // Cooldown is 0ms, circuit should immediately allow retry
      await shortCooldownService.fetchBusyTimes(params);
      expect(failAdapter.fetchBusyTimes).toHaveBeenCalledTimes(4);
    });

    test("uses custom threshold from config", async () => {
      const customService = new CalendarService({
        selectedCalendarRepo: mockSelectedCalendarRepo as unknown as SelectedCalendarRepository,
        cacheService: mockCacheService as unknown as CalendarCacheService,
        syncService: mockSyncService as unknown as CalendarSyncService,
        credentialRepo: mockCredentialRepo as unknown as CredentialRepository,
        config: { circuitBreakerThreshold: 1 },
      });

      const failAdapter = createMockAdapter({
        fetchBusyTimes: vi.fn().mockRejectedValue(new Error("Fail")),
      });
      mockedCreateAdapter.mockReturnValue(failAdapter);

      const params = makeParams(1);

      // 1 failure should trip breaker with threshold=1
      await customService.fetchBusyTimes(params);
      const result = await customService.fetchBusyTimes(params);

      expect(failAdapter.fetchBusyTimes).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    test("tracks circuit breaker state independently per credential", async () => {
      const failAdapter = createMockAdapter({
        fetchBusyTimes: vi.fn().mockRejectedValue(new Error("Fail")),
      });
      mockedCreateAdapter.mockReturnValue(failAdapter);

      const params1 = makeParams(1);
      const params2 = makeParams(2);

      // Trip breaker for cred 1
      await service.fetchBusyTimes(params1);
      await service.fetchBusyTimes(params1);
      await service.fetchBusyTimes(params1);

      // Cred 1 is open, cred 2 should still work
      const combinedParams = {
        credentials: [makeCredential(1), makeCredential(2)],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [
          makeSelectedCalendar({ credentialId: 1, externalId: "cal-1" }),
          makeSelectedCalendar({ credentialId: 2, externalId: "cal-2" }),
        ],
      };

      // Reset call count
      vi.mocked(failAdapter.fetchBusyTimes).mockClear();
      await service.fetchBusyTimes(combinedParams);

      // Only cred2's adapter should have been called (cred1 is circuit-broken)
      expect(failAdapter.fetchBusyTimes).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Credential invalidation
  // =========================================================================

  describe("credential invalidation", () => {
    test("invalidates credential on 401 Unauthorized error", async () => {
      const authError = new CalendarAdapterError({
        provider: "google_calendar",
        message: "Unauthorized",
        status: 401,
      });
      const adapter = createMockAdapter({
        fetchBusyTimes: vi.fn().mockRejectedValue(authError),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      await service.fetchBusyTimes({
        credentials: [makeCredential(1)],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [makeSelectedCalendar({ credentialId: 1, externalId: "cal-a" })],
      });

      expect(mockCredentialRepo.invalidate).toHaveBeenCalledWith(1);
    });

    test("invalidates credential on 403 Forbidden error", async () => {
      const authError = new CalendarAdapterError({
        provider: "google_calendar",
        message: "Forbidden",
        status: 403,
      });
      const adapter = createMockAdapter({
        fetchBusyTimes: vi.fn().mockRejectedValue(authError),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      await service.fetchBusyTimes({
        credentials: [makeCredential(1)],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [makeSelectedCalendar({ credentialId: 1, externalId: "cal-a" })],
      });

      expect(mockCredentialRepo.invalidate).toHaveBeenCalledWith(1);
    });

    test("does NOT invalidate credential on 500 server error", async () => {
      const serverError = new CalendarAdapterError({
        provider: "google_calendar",
        message: "Internal Server Error",
        status: 500,
      });
      const adapter = createMockAdapter({
        fetchBusyTimes: vi.fn().mockRejectedValue(serverError),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      await service.fetchBusyTimes({
        credentials: [makeCredential(1)],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [makeSelectedCalendar({ credentialId: 1, externalId: "cal-a" })],
      });

      expect(mockCredentialRepo.invalidate).not.toHaveBeenCalled();
    });

    test("does NOT invalidate credential on generic Error (non-CalendarAdapterError)", async () => {
      const genericError = new Error("Something broke");
      const adapter = createMockAdapter({
        fetchBusyTimes: vi.fn().mockRejectedValue(genericError),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      await service.fetchBusyTimes({
        credentials: [makeCredential(1)],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [makeSelectedCalendar({ credentialId: 1, externalId: "cal-a" })],
      });

      expect(mockCredentialRepo.invalidate).not.toHaveBeenCalled();
    });

    test("does NOT invalidate on 429 rate-limit error", async () => {
      const rateLimitError = new CalendarAdapterError({
        provider: "google_calendar",
        message: "Rate limited",
        status: 429,
      });
      const adapter = createMockAdapter({
        fetchBusyTimes: vi.fn().mockRejectedValue(rateLimitError),
      });
      mockedCreateAdapter.mockReturnValue(adapter);

      await service.fetchBusyTimes({
        credentials: [makeCredential(1)],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        selectedCalendars: [makeSelectedCalendar({ credentialId: 1, externalId: "cal-a" })],
      });

      expect(mockCredentialRepo.invalidate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Subscribe
  // =========================================================================

  describe("subscribe", () => {
    test("resolves credential, calls adapter.subscribe with correct calendarId and webhookUrl", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1, externalId: "ext-cal-id" });
      mockSelectedCalendarRepo.findById.mockResolvedValue(cal);

      const serviceWithWebhook = new CalendarService({
        selectedCalendarRepo: mockSelectedCalendarRepo as unknown as SelectedCalendarRepository,
        cacheService: mockCacheService as unknown as CalendarCacheService,
        syncService: mockSyncService as unknown as CalendarSyncService,
        credentialRepo: mockCredentialRepo as unknown as CredentialRepository,
        config: { webhookBaseUrl: "https://api.cal.com" },
      });

      await serviceWithWebhook.subscribe("sc-1");

      expect(mockSubscriptionAdapter.subscribe).toHaveBeenCalledWith({
        calendarId: "ext-cal-id",
        webhookUrl: "https://api.cal.com/calendars/google_calendar/webhook",
      });
    });

    test("uses empty webhookUrl when webhookBaseUrl is not configured", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1 });
      mockSelectedCalendarRepo.findById.mockResolvedValue(cal);

      await service.subscribe("sc-1");

      expect(mockSubscriptionAdapter.subscribe).toHaveBeenCalledWith({
        calendarId: "ext-1",
        webhookUrl: "",
      });
    });

    test("persists channel data to repository on successful subscription", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1 });
      mockSelectedCalendarRepo.findById.mockResolvedValue(cal);

      await service.subscribe("sc-1");

      expect(mockSelectedCalendarRepo.updateSubscription).toHaveBeenCalledWith("sc-1", {
        channelId: "ch-1",
        channelResourceId: "res-1",
        channelResourceUri: "https://example.com/resource",
        channelExpiration: new Date("2026-04-24T00:00:00Z"),
        syncSubscribedAt: expect.any(Date),
        syncSubscribedErrorAt: null,
        syncSubscribedErrorCount: 0,
      });
    });

    test("triggers processEvents after successful subscription", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1 });
      mockSelectedCalendarRepo.findById.mockResolvedValue(cal);

      await service.subscribe("sc-1");

      // processEvents calls fetchEvents on the adapter
      expect(mockSubscriptionAdapter.fetchEvents).toHaveBeenCalledWith({
        calendarId: "ext-1",
        syncToken: null,
      });
    });

    test("increments error count on subscription failure", async () => {
      const cal = makeSelectedCalendar({
        id: "sc-1",
        credentialId: 1,
        syncSubscribedErrorCount: 1,
      });
      mockSelectedCalendarRepo.findById.mockResolvedValue(cal);

      mockSubscriptionAdapter.subscribe = vi.fn().mockRejectedValue(new Error("Subscribe failed"));
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      await expect(service.subscribe("sc-1")).rejects.toThrow("Subscribe failed");

      expect(mockSelectedCalendarRepo.updateSubscription).toHaveBeenCalledWith("sc-1", {
        syncSubscribedAt: null,
        syncSubscribedErrorAt: expect.any(Date),
        syncSubscribedErrorCount: 2,
      });
    });

    test("caps error count at maxSubscribeErrors (default 3)", async () => {
      const cal = makeSelectedCalendar({
        id: "sc-1",
        credentialId: 1,
        syncSubscribedErrorCount: 2,
      });
      mockSelectedCalendarRepo.findById.mockResolvedValue(cal);

      mockSubscriptionAdapter.subscribe = vi.fn().mockRejectedValue(new Error("Subscribe failed"));
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      await expect(service.subscribe("sc-1")).rejects.toThrow("Subscribe failed");

      expect(mockSelectedCalendarRepo.updateSubscription).toHaveBeenCalledWith("sc-1", {
        syncSubscribedAt: null,
        syncSubscribedErrorAt: expect.any(Date),
        syncSubscribedErrorCount: 3,
      });
    });

    test("skips subscription when error threshold is already reached", async () => {
      const cal = makeSelectedCalendar({
        id: "sc-1",
        credentialId: 1,
        syncSubscribedErrorCount: 3,
      });
      mockSelectedCalendarRepo.findById.mockResolvedValue(cal);

      await service.subscribe("sc-1");

      expect(mockSubscriptionAdapter.subscribe).not.toHaveBeenCalled();
      expect(mockSelectedCalendarRepo.updateSubscription).not.toHaveBeenCalled();
    });

    test("returns early when calendar is not found", async () => {
      mockSelectedCalendarRepo.findById.mockResolvedValue(null);

      await service.subscribe("nonexistent");

      expect(mockSubscriptionAdapter.subscribe).not.toHaveBeenCalled();
      expect(mockCredentialRepo.resolve).not.toHaveBeenCalled();
    });

    test("returns early when calendar has no credentialId and no delegationCredentialId", async () => {
      const cal = makeSelectedCalendar({
        id: "sc-1",
        credentialId: null,
        delegationCredentialId: null,
      });
      mockSelectedCalendarRepo.findById.mockResolvedValue(cal);

      await service.subscribe("sc-1");

      expect(mockSubscriptionAdapter.subscribe).not.toHaveBeenCalled();
    });

    test("returns early when adapter does not support subscriptions", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1 });
      mockSelectedCalendarRepo.findById.mockResolvedValue(cal);

      mockSubscriptionAdapter.subscribe = undefined as unknown as ReturnType<typeof vi.fn>;
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      await service.subscribe("sc-1");

      expect(mockSelectedCalendarRepo.updateSubscription).not.toHaveBeenCalled();
    });

    test("uses custom maxSubscribeErrors from config", async () => {
      const serviceCustomMax = new CalendarService({
        selectedCalendarRepo: mockSelectedCalendarRepo as unknown as SelectedCalendarRepository,
        cacheService: mockCacheService as unknown as CalendarCacheService,
        syncService: mockSyncService as unknown as CalendarSyncService,
        credentialRepo: mockCredentialRepo as unknown as CredentialRepository,
        config: { maxSubscribeErrors: 1 },
      });

      const cal = makeSelectedCalendar({
        id: "sc-1",
        credentialId: 1,
        syncSubscribedErrorCount: 1,
      });
      mockSelectedCalendarRepo.findById.mockResolvedValue(cal);

      await serviceCustomMax.subscribe("sc-1");

      expect(mockSubscriptionAdapter.subscribe).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Unsubscribe
  // =========================================================================

  describe("unsubscribe", () => {
    test("calls adapter.unsubscribe with channelId/resourceId and clears subscription + cache + sync state in transaction", async () => {
      const cal = makeSelectedCalendar({
        id: "sc-1",
        credentialId: 1,
        channelId: "ch-1",
        channelResourceId: "res-1",
      });
      mockSelectedCalendarRepo.findById.mockResolvedValue(cal);

      await service.unsubscribe("sc-1");

      expect(mockSubscriptionAdapter.unsubscribe).toHaveBeenCalledWith({
        channelId: "ch-1",
        resourceId: "res-1",
      });
      // All channel metadata AND sync state must be cleared atomically via
      // clearUnsubscribeState (a single transaction) so processWebhook can no
      // longer route incoming webhooks and fetchBusyTimes doesn't serve from
      // the now-empty cache.
      expect(mockSelectedCalendarRepo.clearUnsubscribeState).toHaveBeenCalledWith("sc-1");
      expect(mockCacheService.cleanupCache).toHaveBeenCalledWith("sc-1");
    });

    test("returns early when calendar is not found", async () => {
      mockSelectedCalendarRepo.findById.mockResolvedValue(null);

      await service.unsubscribe("nonexistent");

      expect(mockSubscriptionAdapter.unsubscribe).not.toHaveBeenCalled();
      expect(mockCacheService.cleanupCache).not.toHaveBeenCalled();
    });

    test("returns early when adapter has no unsubscribe method", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1, channelId: "ch-1" });
      mockSelectedCalendarRepo.findById.mockResolvedValue(cal);

      mockSubscriptionAdapter.unsubscribe = undefined as unknown as ReturnType<typeof vi.fn>;
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      await service.unsubscribe("sc-1");

      expect(mockSelectedCalendarRepo.clearUnsubscribeState).not.toHaveBeenCalled();
    });

    test("returns early when calendar has no channelId", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1, channelId: null });
      mockSelectedCalendarRepo.findById.mockResolvedValue(cal);

      await service.unsubscribe("sc-1");

      expect(mockSubscriptionAdapter.unsubscribe).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // processWebhook
  // =========================================================================

  describe("processWebhook", () => {
    test("finds calendar by channelId, updates lastWebhookReceivedAt, and returns processEvents result", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1, channelId: "ch-1" });
      mockSelectedCalendarRepo.findByChannelId.mockResolvedValue(cal);

      const events = [makeCalendarEvent({ uid: "evt-1" })];
      mockSubscriptionAdapter.fetchEvents = vi
        .fn()
        .mockResolvedValue(makeFetchEventsResult({ events, nextSyncToken: "token-2" }));
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      const result = await service.processWebhook("google_calendar", "ch-1");

      expect(mockSelectedCalendarRepo.findByChannelId).toHaveBeenCalledWith("ch-1");
      expect(mockSelectedCalendarRepo.updateLastWebhookReceivedAt).toHaveBeenCalledWith("sc-1");
      expect(result).not.toBeNull();
      expect(result!.eventsFetched).toBe(1);
      expect(result!.eventsCached).toBe(1);
    });

    test("returns null when no calendar is found for the channelId", async () => {
      mockSelectedCalendarRepo.findByChannelId.mockResolvedValue(null);

      const result = await service.processWebhook("google_calendar", "unknown-ch");

      expect(result).toBeNull();
      expect(mockSelectedCalendarRepo.updateLastWebhookReceivedAt).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // processEvents
  // =========================================================================

  describe("processEvents", () => {
    test("fetches events, updates sync status, and routes to cache and sync services", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1, syncToken: "old-token" });
      const events = [
        makeCalendarEvent({ uid: "evt-1", status: "confirmed" }),
        makeCalendarEvent({ uid: "evt-2", status: "confirmed" }),
      ];

      mockSubscriptionAdapter.fetchEvents = vi
        .fn()
        .mockResolvedValue(makeFetchEventsResult({ events, nextSyncToken: "new-token" }));
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      const result = await service.processEvents(cal);

      expect(result.eventsFetched).toBe(2);
      expect(result.eventsCached).toBe(2);
      expect(result.eventsSynced).toBe(0);

      expect(mockSubscriptionAdapter.fetchEvents).toHaveBeenCalledWith({
        calendarId: "ext-1",
        syncToken: "old-token",
      });

      expect(mockSelectedCalendarRepo.updateSyncStatus).toHaveBeenCalledWith("sc-1", {
        syncToken: "new-token",
        syncedAt: expect.any(Date),
        syncErrorAt: null,
        syncErrorCount: 0,
      });

      expect(mockCacheService.handleEvents).toHaveBeenCalledWith(cal, events);
      expect(mockSyncService.handleEvents).toHaveBeenCalledWith(cal, events);
    });

    test("preserves empty-string nextSyncToken via ?? instead of falling back to old token", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1, syncToken: "existing-token" });
      const events = [makeCalendarEvent()];

      mockSubscriptionAdapter.fetchEvents = vi
        .fn()
        .mockResolvedValue(makeFetchEventsResult({ events, nextSyncToken: "" }));
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      await service.processEvents(cal);

      // ?? preserves empty string (non-nullish) — does NOT fall back to old token
      expect(mockSelectedCalendarRepo.updateSyncStatus).toHaveBeenCalledWith("sc-1", {
        syncToken: "",
        syncedAt: expect.any(Date),
        syncErrorAt: null,
        syncErrorCount: 0,
      });
    });

    test("falls back to existing syncToken when nextSyncToken is null", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1, syncToken: "existing-token" });
      const events = [makeCalendarEvent()];

      mockSubscriptionAdapter.fetchEvents = vi
        .fn()
        .mockResolvedValue(makeFetchEventsResult({ events, nextSyncToken: null as unknown as string }));
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      await service.processEvents(cal);

      // ?? falls back to existing token only when nextSyncToken is null/undefined
      expect(mockSelectedCalendarRepo.updateSyncStatus).toHaveBeenCalledWith("sc-1", {
        syncToken: "existing-token",
        syncedAt: expect.any(Date),
        syncErrorAt: null,
        syncErrorCount: 0,
      });
    });

    test("clears syncToken immediately when fullSyncRequired is true", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1, syncToken: "expired-token" });

      mockSubscriptionAdapter.fetchEvents = vi
        .fn()
        .mockResolvedValue(
          makeFetchEventsResult({ events: [], nextSyncToken: "", fullSyncRequired: true })
        );
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      const result = await service.processEvents(cal);

      // syncToken AND syncedAt cleared to null so next call does a full sync
      // and fetchBusyTimes routes through the adapter (not the now-stale cache).
      expect(mockSelectedCalendarRepo.updateSyncStatus).toHaveBeenCalledWith("sc-1", {
        syncToken: null,
        syncedAt: null,
        syncErrorAt: null,
        syncErrorCount: 0,
      });

      // Returns early — no events processed
      expect(result.eventsFetched).toBe(0);
      expect(result.eventsCached).toBe(0);
      expect(result.eventsSynced).toBe(0);

      // Cache and sync services should NOT be called
      expect(mockCacheService.handleEvents).not.toHaveBeenCalled();
      expect(mockSyncService.handleEvents).not.toHaveBeenCalled();
    });

    test("counts eventsCached as non-cancelled events only", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1 });
      const events = [
        makeCalendarEvent({ uid: "evt-1", status: "confirmed" }),
        makeCalendarEvent({ uid: "evt-2", status: "cancelled" }),
        makeCalendarEvent({ uid: "evt-3", status: "tentative" }),
      ];

      mockSubscriptionAdapter.fetchEvents = vi.fn().mockResolvedValue(makeFetchEventsResult({ events }));
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      const result = await service.processEvents(cal);

      expect(result.eventsFetched).toBe(3);
      expect(result.eventsCached).toBe(2);
    });

    test("counts eventsSynced as events with iCalUID ending in @cal.com", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1 });
      const events = [
        makeCalendarEvent({ uid: "evt-1", iCalUID: "abc123@cal.com" }),
        makeCalendarEvent({ uid: "evt-2", iCalUID: "xyz789@google.com" }),
        makeCalendarEvent({ uid: "evt-3", iCalUID: null }),
      ];

      mockSubscriptionAdapter.fetchEvents = vi.fn().mockResolvedValue(makeFetchEventsResult({ events }));
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      const result = await service.processEvents(cal);

      expect(result.eventsSynced).toBe(1);
    });

    test("counts eventsSynced via uid field when iCalUID is absent", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1 });
      const events = [
        makeCalendarEvent({ uid: "booking-42@cal.com", iCalUID: null }),
        makeCalendarEvent({ uid: "other-uid", iCalUID: null }),
      ];

      mockSubscriptionAdapter.fetchEvents = vi.fn().mockResolvedValue(makeFetchEventsResult({ events }));
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      const result = await service.processEvents(cal);

      expect(result.eventsSynced).toBe(1);
    });

    test("returns zero counts when no events are fetched but still saves syncToken", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1 });

      mockSubscriptionAdapter.fetchEvents = vi
        .fn()
        .mockResolvedValue(makeFetchEventsResult({ events: [], nextSyncToken: "new-token" }));
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      const result = await service.processEvents(cal);

      expect(result).toEqual({ eventsFetched: 0, eventsCached: 0, eventsSynced: 0 });
      expect(mockCacheService.handleEvents).not.toHaveBeenCalled();
      expect(mockSyncService.handleEvents).not.toHaveBeenCalled();
      expect(mockSelectedCalendarRepo.updateSyncStatus).toHaveBeenCalledWith("sc-1", {
        syncToken: "new-token",
        syncedAt: expect.any(Date),
        syncErrorAt: null,
        syncErrorCount: 0,
      });
    });

    test("returns zero counts when adapter does not support fetchEvents", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1 });
      mockSubscriptionAdapter.fetchEvents = undefined as unknown as ReturnType<typeof vi.fn>;
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      const result = await service.processEvents(cal);

      expect(result).toEqual({ eventsFetched: 0, eventsCached: 0, eventsSynced: 0 });
    });

    test("increments syncErrorCount on non-transient fetch failure", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1, syncErrorCount: 1 });

      mockSubscriptionAdapter.fetchEvents = vi.fn().mockRejectedValue(new Error("Fetch failed"));
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      await expect(service.processEvents(cal)).rejects.toThrow("Fetch failed");

      expect(mockSelectedCalendarRepo.updateSyncStatus).toHaveBeenCalledWith("sc-1", {
        syncErrorAt: expect.any(Date),
        syncErrorCount: { increment: 1 },
      });
    });

    test("resets syncToken after reaching maxSyncErrors consecutive failures", async () => {
      const cal = makeSelectedCalendar({
        id: "sc-1",
        credentialId: 1,
        syncErrorCount: 2,
      });

      mockSubscriptionAdapter.fetchEvents = vi.fn().mockRejectedValue(new Error("Fetch failed"));
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      await expect(service.processEvents(cal)).rejects.toThrow("Fetch failed");

      expect(mockSelectedCalendarRepo.updateSyncStatus).toHaveBeenCalledWith("sc-1", {
        syncErrorAt: expect.any(Date),
        syncErrorCount: 0,
        syncToken: null,
      });
    });

    test("does NOT reset syncToken when error count is below maxSyncErrors", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1, syncErrorCount: 0 });

      mockSubscriptionAdapter.fetchEvents = vi.fn().mockRejectedValue(new Error("Fetch failed"));
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      await expect(service.processEvents(cal)).rejects.toThrow("Fetch failed");

      const updateCall = mockSelectedCalendarRepo.updateSyncStatus.mock.calls[0][1];
      expect(updateCall).not.toHaveProperty("syncToken");
    });

    test("transient error returns early without incrementing error count", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1, syncErrorCount: 1 });

      const transientError = new CalendarAdapterError({
        provider: "google_calendar",
        message: "Rate limited",
        status: 429,
        transient: true,
      });
      mockSubscriptionAdapter.fetchEvents = vi.fn().mockRejectedValue(transientError);
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      const result = await service.processEvents(cal);

      expect(mockSelectedCalendarRepo.updateSyncStatus).not.toHaveBeenCalled();
      expect(result).toEqual({ eventsFetched: 0, eventsCached: 0, eventsSynced: 0 });
    });

    test("transient error does NOT throw", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1 });

      const transientError = new CalendarAdapterError({
        provider: "google_calendar",
        message: "Service Unavailable",
        status: 503,
        transient: true,
      });
      mockSubscriptionAdapter.fetchEvents = vi.fn().mockRejectedValue(transientError);
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      // Should NOT throw
      const result = await service.processEvents(cal);
      expect(result.eventsFetched).toBe(0);
    });

    test("non-transient CalendarAdapterError increments error count and rethrows", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1, syncErrorCount: 0 });

      const permanentError = new CalendarAdapterError({
        provider: "google_calendar",
        message: "Not Found",
        status: 404,
        transient: false,
      });
      mockSubscriptionAdapter.fetchEvents = vi.fn().mockRejectedValue(permanentError);
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      await expect(service.processEvents(cal)).rejects.toThrow("Not Found");

      expect(mockSelectedCalendarRepo.updateSyncStatus).toHaveBeenCalledWith("sc-1", {
        syncErrorAt: expect.any(Date),
        syncErrorCount: { increment: 1 },
      });
    });

    test("uses null syncToken when selectedCalendar has no syncToken", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1, syncToken: null });

      mockSubscriptionAdapter.fetchEvents = vi.fn().mockResolvedValue(makeFetchEventsResult({ events: [] }));
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      await service.processEvents(cal);

      expect(mockSubscriptionAdapter.fetchEvents).toHaveBeenCalledWith({
        calendarId: "ext-1",
        syncToken: null,
      });
    });
  });

  // =========================================================================
  // Subscription lifecycle: subscribe -> processEvents -> webhook flow
  // =========================================================================

  describe("subscription lifecycle", () => {
    test("subscribe triggers processEvents which updates sync status and routes events", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1 });
      mockSelectedCalendarRepo.findById.mockResolvedValue(cal);

      const events = [
        makeCalendarEvent({ uid: "evt-1", iCalUID: "booking-1@cal.com", status: "confirmed" }),
        makeCalendarEvent({ uid: "evt-2", status: "cancelled" }),
      ];
      mockSubscriptionAdapter.fetchEvents = vi
        .fn()
        .mockResolvedValue(makeFetchEventsResult({ events, nextSyncToken: "sync-token-1" }));
      mockedCreateAdapter.mockReturnValue(mockSubscriptionAdapter as unknown as CalendarAdapter);

      await service.subscribe("sc-1");

      // updateSubscription called for subscribe success
      expect(mockSelectedCalendarRepo.updateSubscription).toHaveBeenCalledWith("sc-1", {
        channelId: "ch-1",
        channelResourceId: "res-1",
        channelResourceUri: "https://example.com/resource",
        channelExpiration: new Date("2026-04-24T00:00:00Z"),
        syncSubscribedAt: expect.any(Date),
        syncSubscribedErrorAt: null,
        syncSubscribedErrorCount: 0,
      });

      // updateSyncStatus called for processEvents success
      expect(mockSelectedCalendarRepo.updateSyncStatus).toHaveBeenCalledWith("sc-1", {
        syncToken: "sync-token-1",
        syncedAt: expect.any(Date),
        syncErrorAt: null,
        syncErrorCount: 0,
      });

      expect(mockCacheService.handleEvents).toHaveBeenCalledWith(cal, events);
      expect(mockSyncService.handleEvents).toHaveBeenCalledWith(cal, events);
    });
  });

  // =========================================================================
  // checkForNewSubscriptions
  // =========================================================================

  describe("checkForNewSubscriptions", () => {
    test("fetches batch of calendars and subscribes each one", async () => {
      const cal1 = makeSelectedCalendar({ id: "sc-1", credentialId: 1 });
      const cal2 = makeSelectedCalendar({ id: "sc-2", credentialId: 2 });

      mockSelectedCalendarRepo.findNextSubscriptionBatch.mockResolvedValue([cal1, cal2]);
      mockSelectedCalendarRepo.findById.mockResolvedValueOnce(cal1).mockResolvedValueOnce(cal2);

      await service.checkForNewSubscriptions();

      expect(mockSelectedCalendarRepo.findNextSubscriptionBatch).toHaveBeenCalledWith({
        take: 100,
        integrations: ["google_calendar", "office365_calendar", "feishu_calendar", "lark_calendar"],
      });
      expect(mockSelectedCalendarRepo.findById).toHaveBeenCalledTimes(2);
    });

    test("uses Promise.allSettled so one subscription failure does not block others", async () => {
      const cal1 = makeSelectedCalendar({ id: "sc-1", credentialId: 1 });
      const cal2 = makeSelectedCalendar({ id: "sc-2", credentialId: 2 });

      mockSelectedCalendarRepo.findNextSubscriptionBatch.mockResolvedValue([cal1, cal2]);
      // First one fails (not found), second one succeeds
      mockSelectedCalendarRepo.findById.mockResolvedValueOnce(null).mockResolvedValueOnce(cal2);

      // Should not throw
      await service.checkForNewSubscriptions();

      // findById was still called for both
      expect(mockSelectedCalendarRepo.findById).toHaveBeenCalledTimes(2);
    });

    test("handles empty batch gracefully", async () => {
      mockSelectedCalendarRepo.findNextSubscriptionBatch.mockResolvedValue([]);

      await service.checkForNewSubscriptions();

      expect(mockSelectedCalendarRepo.findById).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // credentialRepo.resolve failures
  // =========================================================================

  describe("credentialRepo.resolve errors", () => {
    test("subscribe propagates credentialRepo.resolve failure", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1 });
      mockSelectedCalendarRepo.findById.mockResolvedValue(cal);
      mockCredentialRepo.resolve.mockRejectedValue(new Error("Credential not found"));

      await expect(service.subscribe("sc-1")).rejects.toThrow("Credential not found");
    });

    test("processEvents propagates credentialRepo.resolve failure", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1 });
      mockCredentialRepo.resolve.mockRejectedValue(new Error("Decryption failed"));

      await expect(service.processEvents(cal)).rejects.toThrow("Decryption failed");
    });

    test("unsubscribe propagates credentialRepo.resolve failure", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1", credentialId: 1, channelId: "ch-1" });
      mockSelectedCalendarRepo.findById.mockResolvedValue(cal);
      mockCredentialRepo.resolve.mockRejectedValue(new Error("Token expired"));

      await expect(service.unsubscribe("sc-1")).rejects.toThrow("Token expired");
    });
  });
});
