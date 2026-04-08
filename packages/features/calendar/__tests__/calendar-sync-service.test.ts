import type { CalendarEvent } from "@calcom/calendar-adapter/calendar-adapter-types";
import type { SelectedCalendar } from "@calcom/prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { BookingSyncResult } from "../services/calendar-sync-service";
import { CalendarSyncService } from "../services/calendar-sync-service";

// ---------------------------------------------------------------------------
// Logger spy — intercept structured log output.
// vi.hoisted ensures the spies exist before the vi.mock factory runs.
// ---------------------------------------------------------------------------

const logSpies = vi.hoisted(() => ({
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => logSpies,
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSelectedCalendar(overrides: Partial<SelectedCalendar> = {}): SelectedCalendar {
  return {
    id: "sc-1",
    externalId: "ext-1",
    integration: "google_calendar",
    credentialId: 1,
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
    title: "Some Event",
    start: new Date("2026-03-24T10:00:00Z"),
    end: new Date("2026-03-24T11:00:00Z"),
    status: "confirmed",
    ...overrides,
  };
}

function expectCleanResult(result: BookingSyncResult): void {
  expect(result.total).toBe(0);
  expect(result.synced).toBe(0);
  expect(result.cancelled).toBe(0);
  expect(result.rescheduled).toBe(0);
  expect(result.fieldUpdates).toBe(0);
  expect(result.errors).toBe(0);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CalendarSyncService", () => {
  let service: CalendarSyncService;
  const cal = makeSelectedCalendar();

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CalendarSyncService();
  });

  // =========================================================================
  // iCalUID filtering — Cal.com detection
  // =========================================================================

  describe("iCalUID filtering for Cal.com events", () => {
    test("identifies event with iCalUID ending in @cal.com as Cal.com event", async () => {
      const result = await service.handleEvents(cal, [
        makeCalendarEvent({ uid: "e1", iCalUID: "abc123@cal.com" }),
      ]);

      expect(result.total).toBe(1);
      expect(result.synced).toBe(1);
    });

    test("matches @CAL.COM (fully uppercase) case-insensitively", async () => {
      const result = await service.handleEvents(cal, [
        makeCalendarEvent({ uid: "e1", iCalUID: "ABC123@CAL.COM" }),
      ]);

      expect(result.total).toBe(1);
      expect(result.synced).toBe(1);
    });

    test("matches @Cal.Com (mixed case) case-insensitively", async () => {
      const result = await service.handleEvents(cal, [
        makeCalendarEvent({ uid: "e1", iCalUID: "xyz@Cal.Com" }),
      ]);

      expect(result.total).toBe(1);
      expect(result.synced).toBe(1);
    });

    test("matches @cal.COM (partial uppercase) case-insensitively", async () => {
      const result = await service.handleEvents(cal, [
        makeCalendarEvent({ uid: "e1", iCalUID: "uid@cal.COM" }),
      ]);

      expect(result.total).toBe(1);
      expect(result.synced).toBe(1);
    });

    test("rejects event where @cal.com appears in the middle of iCalUID (not a suffix)", async () => {
      const result = await service.handleEvents(cal, [
        makeCalendarEvent({ uid: "e1", iCalUID: "user@cal.com.evil.org" }),
      ]);

      expectCleanResult(result);
    });

    test("rejects event with @cal.com as a substring but not at the end", async () => {
      const result = await service.handleEvents(cal, [
        makeCalendarEvent({ uid: "e1", iCalUID: "abc@cal.com-extra" }),
      ]);

      expectCleanResult(result);
    });

    test("rejects non-Cal.com iCalUID suffixes", async () => {
      const events = [
        makeCalendarEvent({ uid: "e1", iCalUID: "aaa@outlook.com" }),
        makeCalendarEvent({ uid: "e2", iCalUID: "bbb@google.com" }),
        makeCalendarEvent({ uid: "e3", iCalUID: "ccc@yahoo.com" }),
      ];

      const result = await service.handleEvents(cal, events);

      expectCleanResult(result);
    });

    test("skips event with null iCalUID when uid does not end in @cal.com", async () => {
      const result = await service.handleEvents(cal, [makeCalendarEvent({ uid: "e1", iCalUID: null })]);

      expectCleanResult(result);
    });

    test("falls back to uid when iCalUID is null and uid ends in @cal.com", async () => {
      const result = await service.handleEvents(cal, [
        makeCalendarEvent({ uid: "booking-42@cal.com", iCalUID: null }),
      ]);

      expect(result.total).toBe(1);
      expect(result.synced).toBe(1);
    });

    test("skips event with undefined iCalUID when uid does not end in @cal.com", async () => {
      const result = await service.handleEvents(cal, [makeCalendarEvent({ uid: "e1", iCalUID: undefined })]);

      expectCleanResult(result);
    });

    test("skips event with empty string iCalUID", async () => {
      const result = await service.handleEvents(cal, [makeCalendarEvent({ uid: "e1", iCalUID: "" })]);

      expectCleanResult(result);
    });

    test("filters correctly in a mixed batch of Cal.com and external events", async () => {
      const events = [
        makeCalendarEvent({ uid: "e1", iCalUID: "meeting-1@cal.com" }),
        makeCalendarEvent({ uid: "e2", iCalUID: "external@zoom.us" }),
        makeCalendarEvent({ uid: "e3", iCalUID: "booking-2@cal.com" }),
        makeCalendarEvent({ uid: "e4", iCalUID: null }),
        makeCalendarEvent({ uid: "e5", iCalUID: undefined }),
        makeCalendarEvent({ uid: "e6", iCalUID: "" }),
        makeCalendarEvent({ uid: "e7", iCalUID: "fake@cal.com.evil" }),
      ];

      const result = await service.handleEvents(cal, events);

      expect(result.total).toBe(2);
      expect(result.synced).toBe(2);
      expect(result.errors).toBe(0);
    });
  });

  // =========================================================================
  // Empty and edge-case inputs
  // =========================================================================

  describe("empty and edge-case inputs", () => {
    test("returns zero-initialised result for empty event list", async () => {
      const result = await service.handleEvents(cal, []);

      expectCleanResult(result);
    });

    test("logs info message when no Cal.com events are found", async () => {
      await service.handleEvents(cal, []);

      expect(logSpies.info).toHaveBeenCalledWith("handleEvents: no Cal.com events to process");
    });
  });

  // =========================================================================
  // Status handling — cancelled / confirmed / tentative / unknown
  // =========================================================================

  describe("event status routing", () => {
    test("cancelled event increments synced but not cancelled without a handler", async () => {
      const result = await service.handleEvents(cal, [
        makeCalendarEvent({ uid: "e1", iCalUID: "cancel@cal.com", status: "cancelled" }),
      ]);

      expect(result.total).toBe(1);
      expect(result.cancelled).toBe(0);
      expect(result.rescheduled).toBe(0);
      expect(result.synced).toBe(1);
      expect(result.errors).toBe(0);
    });

    test("handler receives original iCalUID casing (short-uuid uses mixed case)", async () => {
      const mockHandler = {
        cancelByICalUID: vi.fn().mockResolvedValue("cancelled" as const),
        rescheduleByICalUID: vi.fn().mockResolvedValue("rescheduled" as const),
      };
      const serviceWithHandler = new CalendarSyncService({ bookingHandler: mockHandler });

      await serviceWithHandler.handleEvents(cal, [
        makeCalendarEvent({ uid: "e1", iCalUID: "9VprZJ9U1Sae2wr5woHdfo@CAL.COM", status: "cancelled" }),
        makeCalendarEvent({ uid: "e2", iCalUID: "AbCdEfGh1234@Cal.Com", status: "confirmed" }),
      ]);

      // The booking UID portion must preserve original casing because short-uuid
      // generates mixed-case UIDs (flickrBase58) and Postgres does case-sensitive lookups.
      expect(mockHandler.cancelByICalUID).toHaveBeenCalledWith(
        expect.objectContaining({ iCalUID: "9VprZJ9U1Sae2wr5woHdfo@CAL.COM" }),
        expect.any(Number)
      );
      expect(mockHandler.rescheduleByICalUID).toHaveBeenCalledWith(
        expect.objectContaining({ iCalUID: "AbCdEfGh1234@Cal.Com" }),
        expect.any(Number)
      );
    });

    test("cancelled event increments cancelled counter when handler returns cancelled", async () => {
      const mockHandler = {
        cancelByICalUID: vi.fn().mockResolvedValue("cancelled" as const),
        rescheduleByICalUID: vi.fn().mockResolvedValue("skipped" as const),
      };
      const serviceWithHandler = new CalendarSyncService({ bookingHandler: mockHandler });

      const result = await serviceWithHandler.handleEvents(cal, [
        makeCalendarEvent({ uid: "e1", iCalUID: "cancel@cal.com", status: "cancelled" }),
      ]);

      expect(result.total).toBe(1);
      expect(result.cancelled).toBe(1);
      expect(result.synced).toBe(1);
      expect(result.errors).toBe(0);
    });

    test("cancelled event does not increment cancelled counter when handler returns skipped", async () => {
      const mockHandler = {
        cancelByICalUID: vi.fn().mockResolvedValue("skipped" as const),
        rescheduleByICalUID: vi.fn().mockResolvedValue("skipped" as const),
      };
      const serviceWithHandler = new CalendarSyncService({ bookingHandler: mockHandler });

      const result = await serviceWithHandler.handleEvents(cal, [
        makeCalendarEvent({ uid: "e1", iCalUID: "cancel@cal.com", status: "cancelled" }),
      ]);

      expect(result.total).toBe(1);
      expect(result.cancelled).toBe(0);
      expect(result.synced).toBe(1);
      expect(result.errors).toBe(0);
    });

    test("confirmed event increments synced counter (rescheduled depends on handler)", async () => {
      const result = await service.handleEvents(cal, [
        makeCalendarEvent({ uid: "e1", iCalUID: "confirm@cal.com", status: "confirmed" }),
      ]);

      expect(result.total).toBe(1);
      expect(result.rescheduled).toBe(0);
      expect(result.cancelled).toBe(0);
      expect(result.synced).toBe(1);
      expect(result.errors).toBe(0);
    });

    test("tentative event increments synced counter (rescheduled depends on handler)", async () => {
      const result = await service.handleEvents(cal, [
        makeCalendarEvent({ uid: "e1", iCalUID: "tentative@cal.com", status: "tentative" }),
      ]);

      expect(result.total).toBe(1);
      expect(result.rescheduled).toBe(0);
      expect(result.cancelled).toBe(0);
      expect(result.synced).toBe(1);
      expect(result.errors).toBe(0);
    });

    test("event with unrecognised status does not increment synced, cancelled, or rescheduled", async () => {
      const event = makeCalendarEvent({ uid: "e1", iCalUID: "unknown@cal.com" });
      // Force an unrecognised status past the type system
      (event as { status: string }).status = "busy";

      const result = await service.handleEvents(cal, [event]);

      expect(result.total).toBe(1);
      expect(result.synced).toBe(0);
      expect(result.cancelled).toBe(0);
      expect(result.rescheduled).toBe(0);
      expect(result.errors).toBe(0);
    });

    test("event with unrecognised status logs info message", async () => {
      const event = makeCalendarEvent({ uid: "e1", iCalUID: "unknown@cal.com" });
      (event as { status: string }).status = "busy";

      await service.handleEvents(cal, [event]);

      expect(logSpies.info).toHaveBeenCalledWith("handleEvents: skipping event with unhandled status", {
        uid: "e1",
        status: "busy",
      });
    });

    test("mixed statuses tally correctly across cancelled, confirmed, and tentative (no handler)", async () => {
      const events = [
        makeCalendarEvent({ uid: "e1", iCalUID: "a@cal.com", status: "cancelled" }),
        makeCalendarEvent({ uid: "e2", iCalUID: "b@cal.com", status: "confirmed" }),
        makeCalendarEvent({ uid: "e3", iCalUID: "c@cal.com", status: "tentative" }),
        makeCalendarEvent({ uid: "e4", iCalUID: "d@cal.com", status: "cancelled" }),
        makeCalendarEvent({ uid: "e5", iCalUID: "e@cal.com", status: "confirmed" }),
      ];

      const result = await service.handleEvents(cal, events);

      expect(result.total).toBe(5);
      // Without a handler, neither cancelled nor rescheduled counters increment
      expect(result.cancelled).toBe(0);
      expect(result.rescheduled).toBe(0);
      expect(result.synced).toBe(5);
      expect(result.errors).toBe(0);
    });

    test("mixed statuses tally correctly with a handler that returns cancelled/rescheduled", async () => {
      const mockHandler = {
        cancelByICalUID: vi.fn().mockResolvedValue("cancelled" as const),
        rescheduleByICalUID: vi.fn().mockResolvedValue("rescheduled" as const),
      };
      const serviceWithHandler = new CalendarSyncService({ bookingHandler: mockHandler });

      const events = [
        makeCalendarEvent({ uid: "e1", iCalUID: "a@cal.com", status: "cancelled" }),
        makeCalendarEvent({ uid: "e2", iCalUID: "b@cal.com", status: "confirmed" }),
        makeCalendarEvent({ uid: "e3", iCalUID: "c@cal.com", status: "tentative" }),
        makeCalendarEvent({ uid: "e4", iCalUID: "d@cal.com", status: "cancelled" }),
        makeCalendarEvent({ uid: "e5", iCalUID: "e@cal.com", status: "confirmed" }),
      ];

      const result = await serviceWithHandler.handleEvents(cal, events);

      expect(result.total).toBe(5);
      expect(result.cancelled).toBe(2);
      expect(result.rescheduled).toBe(3);
      expect(result.synced).toBe(5);
      expect(result.errors).toBe(0);
    });

    test("handler returning field_update increments fieldUpdates counter", async () => {
      const mockHandler = {
        cancelByICalUID: vi.fn().mockResolvedValue("cancelled" as const),
        rescheduleByICalUID: vi.fn().mockResolvedValue("field_update" as const),
      };
      const serviceWithHandler = new CalendarSyncService({ bookingHandler: mockHandler });

      const result = await serviceWithHandler.handleEvents(cal, [
        makeCalendarEvent({ uid: "e1", iCalUID: "a@cal.com", status: "confirmed" }),
      ]);

      expect(result.total).toBe(1);
      expect(result.fieldUpdates).toBe(1);
      expect(result.rescheduled).toBe(0);
      expect(result.synced).toBe(1);
    });

    test("handler returning skipped increments neither rescheduled nor fieldUpdates", async () => {
      const mockHandler = {
        cancelByICalUID: vi.fn().mockResolvedValue("cancelled" as const),
        rescheduleByICalUID: vi.fn().mockResolvedValue("skipped" as const),
      };
      const serviceWithHandler = new CalendarSyncService({ bookingHandler: mockHandler });

      const result = await serviceWithHandler.handleEvents(cal, [
        makeCalendarEvent({ uid: "e1", iCalUID: "a@cal.com", status: "confirmed" }),
      ]);

      expect(result.total).toBe(1);
      expect(result.fieldUpdates).toBe(0);
      expect(result.rescheduled).toBe(0);
      expect(result.synced).toBe(1);
    });

    test("external events are excluded from status tallies", async () => {
      const events = [
        makeCalendarEvent({ uid: "e1", iCalUID: "a@cal.com", status: "cancelled" }),
        makeCalendarEvent({ uid: "e2", iCalUID: "b@outlook.com", status: "confirmed" }),
        makeCalendarEvent({ uid: "e3", iCalUID: "c@cal.com", status: "tentative" }),
      ];

      const result = await service.handleEvents(cal, events);

      expect(result.total).toBe(2);
      // Without handler, cancelled stays 0
      expect(result.cancelled).toBe(0);
      // Without handler, rescheduled stays 0
      expect(result.rescheduled).toBe(0);
      expect(result.synced).toBe(2);
    });
  });

  // =========================================================================
  // Error resilience — per-event try/catch
  // =========================================================================

  describe("per-event error handling", () => {
    test("error in one event does not prevent processing of subsequent events", async () => {
      const badEvent = makeCalendarEvent({ uid: "bad", iCalUID: "bad@cal.com", status: "confirmed" });
      // Force start to be something that throws on .toISOString()
      Object.defineProperty(badEvent, "start", {
        get() {
          throw new Error("corrupt date");
        },
      });

      const goodEvent = makeCalendarEvent({ uid: "good", iCalUID: "good@cal.com", status: "cancelled" });

      const result = await service.handleEvents(cal, [badEvent, goodEvent]);

      expect(result.total).toBe(2);
      expect(result.errors).toBe(1);
      // Without a handler, cancelled stays 0
      expect(result.cancelled).toBe(0);
      expect(result.synced).toBe(1);
    });

    test("error count increments once per failed event", async () => {
      const makeThrowingEvent = (uid: string): CalendarEvent => {
        const event = makeCalendarEvent({ uid, iCalUID: `${uid}@cal.com`, status: "confirmed" });
        Object.defineProperty(event, "start", {
          get() {
            throw new Error(`fail-${uid}`);
          },
        });
        return event;
      };

      const events = [makeThrowingEvent("e1"), makeThrowingEvent("e2"), makeThrowingEvent("e3")];

      const result = await service.handleEvents(cal, events);

      expect(result.total).toBe(3);
      expect(result.errors).toBe(3);
      expect(result.synced).toBe(0);
    });

    test("logs error with event uid and iCalUID when processing fails", async () => {
      const event = makeCalendarEvent({ uid: "fail-evt", iCalUID: "fail@cal.com", status: "confirmed" });
      Object.defineProperty(event, "start", {
        get() {
          throw new Error("date explosion");
        },
      });

      await service.handleEvents(cal, [event]);

      expect(logSpies.error).toHaveBeenCalledWith("handleEvents: error processing event", {
        uid: "fail-evt",
        iCalUID: "fail@cal.com",
        error: "date explosion",
      });
    });

    test("non-Error thrown in event processing is stringified in log", async () => {
      const event = makeCalendarEvent({ uid: "fail-evt", iCalUID: "fail@cal.com", status: "confirmed" });
      Object.defineProperty(event, "start", {
        get() {
          throw "string-error";
        },
      });

      await service.handleEvents(cal, [event]);

      expect(logSpies.error).toHaveBeenCalledWith("handleEvents: error processing event", {
        uid: "fail-evt",
        iCalUID: "fail@cal.com",
        error: "string-error",
      });
    });
  });

  // =========================================================================
  // Logging verification
  // =========================================================================

  describe("logging", () => {
    test("logs info with event counts when Cal.com events are detected", async () => {
      const events = [
        makeCalendarEvent({ uid: "e1", iCalUID: "a@cal.com" }),
        makeCalendarEvent({ uid: "e2", iCalUID: "b@outlook.com" }),
      ];

      await service.handleEvents(cal, events);

      expect(logSpies.info).toHaveBeenCalledWith("handleEvents: Cal.com events detected", {
        selectedCalendarId: "sc-1",
        total: 2,
        calcomEvents: 1,
      });
    });

    test("logs info for each cancelled event with uid and iCalUID", async () => {
      await service.handleEvents(cal, [
        makeCalendarEvent({ uid: "c1", iCalUID: "cancel@cal.com", status: "cancelled" }),
      ]);

      expect(logSpies.info).toHaveBeenCalledWith("handleEvents: booking cancellation needed", {
        uid: "c1",
        iCalUID: "cancel@cal.com",
      });
    });

    test("logs info for confirmed/tentative events with uid, status, iCalUID, start, end", async () => {
      const start = new Date("2026-06-15T14:00:00Z");
      const end = new Date("2026-06-15T15:00:00Z");

      await service.handleEvents(cal, [
        makeCalendarEvent({ uid: "r1", iCalUID: "resc@cal.com", status: "confirmed", start, end }),
      ]);

      expect(logSpies.info).toHaveBeenCalledWith("handleEvents: potential booking reschedule", {
        uid: "r1",
        status: "confirmed",
        iCalUID: "resc@cal.com",
        start: "2026-06-15T14:00:00.000Z",
        end: "2026-06-15T15:00:00.000Z",
      });
    });

    test("does not log info when there are no Cal.com events", async () => {
      await service.handleEvents(cal, [makeCalendarEvent({ uid: "e1", iCalUID: "ext@google.com" })]);

      expect(logSpies.info).not.toHaveBeenCalledWith(
        "handleEvents: Cal.com events detected",
        expect.anything()
      );
    });
  });

  // =========================================================================
  // Large batch — performance sanity check
  // =========================================================================

  describe("large batch processing", () => {
    test("processes 200 Cal.com events without errors and tallies correctly", async () => {
      const mockHandler = {
        cancelByICalUID: vi.fn().mockResolvedValue("cancelled" as const),
        rescheduleByICalUID: vi.fn().mockResolvedValue("rescheduled" as const),
      };
      const serviceWithHandler = new CalendarSyncService({ bookingHandler: mockHandler });

      const events: CalendarEvent[] = [];
      for (let i = 0; i < 200; i++) {
        const status: CalendarEvent["status"] =
          i % 3 === 0 ? "cancelled" : i % 3 === 1 ? "confirmed" : "tentative";
        events.push(makeCalendarEvent({ uid: `e-${i}`, iCalUID: `uid-${i}@cal.com`, status }));
      }

      const startTime = performance.now();
      const result = await serviceWithHandler.handleEvents(cal, events);
      const elapsed = performance.now() - startTime;

      expect(result.total).toBe(200);
      expect(result.synced).toBe(200);
      expect(result.errors).toBe(0);

      // cancelled: indices 0,3,6,...,198 => 67 items
      expect(result.cancelled).toBe(67);
      // rescheduled: confirmed (i%3===1) + tentative (i%3===2) => 67 + 66 = 133
      expect(result.rescheduled).toBe(133);

      // Should complete well under 1 second
      expect(elapsed).toBeLessThan(1000);
    });

    test("processes mixed batch of 150 events (100 external + 50 Cal.com) efficiently", async () => {
      const mockHandler = {
        cancelByICalUID: vi.fn().mockResolvedValue("cancelled" as const),
        rescheduleByICalUID: vi.fn().mockResolvedValue("rescheduled" as const),
      };
      const serviceWithHandler = new CalendarSyncService({ bookingHandler: mockHandler });

      const events: CalendarEvent[] = [];
      for (let i = 0; i < 100; i++) {
        events.push(makeCalendarEvent({ uid: `ext-${i}`, iCalUID: `ext-${i}@google.com` }));
      }
      for (let i = 0; i < 50; i++) {
        events.push(makeCalendarEvent({ uid: `cal-${i}`, iCalUID: `cal-${i}@cal.com`, status: "confirmed" }));
      }

      const result = await serviceWithHandler.handleEvents(cal, events);

      expect(result.total).toBe(50);
      expect(result.synced).toBe(50);
      expect(result.rescheduled).toBe(50);
      expect(result.cancelled).toBe(0);
      expect(result.errors).toBe(0);
    });
  });

  // =========================================================================
  // BookingSyncResult initial state
  // =========================================================================

  describe("BookingSyncResult return shape", () => {
    test("result always contains all six numeric fields", async () => {
      const result = await service.handleEvents(cal, []);

      expect(result).toEqual({
        total: 0,
        synced: 0,
        cancelled: 0,
        rescheduled: 0,
        fieldUpdates: 0,
        errors: 0,
      });
    });

    test("result fields are exact numbers, not strings or booleans", async () => {
      const result = await service.handleEvents(cal, [
        makeCalendarEvent({ uid: "e1", iCalUID: "a@cal.com", status: "cancelled" }),
      ]);

      expect(typeof result.total).toBe("number");
      expect(typeof result.synced).toBe("number");
      expect(typeof result.cancelled).toBe("number");
      expect(typeof result.rescheduled).toBe("number");
      expect(typeof result.fieldUpdates).toBe("number");
      expect(typeof result.errors).toBe("number");
    });
  });

  // =========================================================================
  // Filter-level error path (catch around the .filter call)
  // =========================================================================

  describe("filter-level error handling", () => {
    test("returns zero-initialised result if the filter itself throws", async () => {
      // Craft an array-like object whose .filter triggers an error
      const poisonedEvents = {
        filter: () => {
          throw new Error("filter exploded");
        },
      } as unknown as CalendarEvent[];

      const result = await service.handleEvents(cal, poisonedEvents);

      expectCleanResult(result);
    });

    test("logs error with selectedCalendarId when filter throws", async () => {
      const poisonedEvents = {
        filter: () => {
          throw new Error("filter exploded");
        },
      } as unknown as CalendarEvent[];

      await service.handleEvents(makeSelectedCalendar({ id: "sc-broken" }), poisonedEvents);

      expect(logSpies.error).toHaveBeenCalledWith("handleEvents: failed to filter Cal.com events", {
        selectedCalendarId: "sc-broken",
        error: "filter exploded",
      });
    });
  });
});
