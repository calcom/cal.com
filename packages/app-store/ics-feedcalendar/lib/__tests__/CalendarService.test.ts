import type { IntegrationCalendar } from "@calcom/types/Calendar";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock the crypto module before importing the service
vi.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: vi.fn().mockImplementation((_key: string) => {
    // Return mock data based on the key
    return JSON.stringify({
      urls: ["https://example.com/calendar1.ics", "https://example.com/calendar2.ics"],
    });
  }),
}));

// Mock prisma for getUserTimezoneFromDB
vi.mock("@calcom/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ timeZone: "America/New_York" }),
    },
  },
}));

// Sample ICS data for testing
function createICSData(events: string[]): string {
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
${events.join("\n")}
END:VCALENDAR`;
}

function createSimpleEvent(uid: string, summary: string, start: string, end: string): string {
  return `BEGIN:VEVENT
UID:${uid}
SUMMARY:${summary}
DTSTART:${start}
DTEND:${end}
END:VEVENT`;
}

function createCancelledEvent(uid: string, summary: string, start: string, end: string): string {
  return `BEGIN:VEVENT
UID:${uid}
SUMMARY:${summary}
DTSTART:${start}
DTEND:${end}
STATUS:CANCELLED
END:VEVENT`;
}

function createRecurringEvent(
  uid: string,
  summary: string,
  start: string,
  end: string,
  rrule: string
): string {
  return `BEGIN:VEVENT
UID:${uid}
SUMMARY:${summary}
DTSTART:${start}
DTEND:${end}
RRULE:${rrule}
END:VEVENT`;
}

function createRecurringEventException(
  uid: string,
  summary: string,
  originalStart: string,
  newStart: string,
  newEnd: string
): string {
  return `BEGIN:VEVENT
UID:${uid}
SUMMARY:${summary}
RECURRENCE-ID:${originalStart}
DTSTART:${newStart}
DTEND:${newEnd}
END:VEVENT`;
}

describe("ICSFeedCalendarService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  describe("getAvailability", () => {
    test("should only process selected calendars", async () => {
      const calendar1Events = createICSData([
        createSimpleEvent("event1", "Calendar 1 Event", "20240115T100000Z", "20240115T110000Z"),
      ]);
      const calendar2Events = createICSData([
        createSimpleEvent("event2", "Calendar 2 Event", "20240115T140000Z", "20240115T150000Z"),
      ]);

      // Mock fetch to return different ICS data for each URL
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url === "https://example.com/calendar1.ics") {
          return Promise.resolve({
            text: () => Promise.resolve(calendar1Events),
          });
        }
        if (url === "https://example.com/calendar2.ics") {
          return Promise.resolve({
            text: () => Promise.resolve(calendar2Events),
          });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      const BuildCalendarService = (await import("../CalendarService")).default;
      const service = BuildCalendarService({
        id: 1,
        userId: 1,
        appId: "ics-feed",
        type: "ics-feed_calendar",
        key: "encrypted-key",
        invalid: false,
        teamId: null,
      });

      // Only select calendar1
      const selectedCalendars: IntegrationCalendar[] = [
        {
          externalId: "https://example.com/calendar1.ics",
          integration: "ics-feed_calendar",
          name: "Calendar 1",
          userId: 1,
        },
      ];

      const availability = await service.getAvailability({
        dateFrom: "2024-01-01T00:00:00Z",
        dateTo: "2024-01-31T23:59:59Z",
        selectedCalendars,
      });

      // Should only include events from calendar1
      expect(availability).toHaveLength(1);
      expect(availability[0].title).toBe("Calendar 1 Event");
    });

    test("should ignore cancelled events", async () => {
      const icsData = createICSData([
        createSimpleEvent("event1", "Active Event", "20240115T100000Z", "20240115T110000Z"),
        createCancelledEvent("event2", "Cancelled Event", "20240115T140000Z", "20240115T150000Z"),
      ]);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve(icsData),
      });

      const BuildCalendarService = (await import("../CalendarService")).default;
      const service = BuildCalendarService({
        id: 1,
        userId: 1,
        appId: "ics-feed",
        type: "ics-feed_calendar",
        key: "encrypted-key",
        invalid: false,
        teamId: null,
      });

      const selectedCalendars: IntegrationCalendar[] = [
        {
          externalId: "https://example.com/calendar1.ics",
          integration: "ics-feed_calendar",
          name: "Calendar 1",
          userId: 1,
        },
      ];

      const availability = await service.getAvailability({
        dateFrom: "2024-01-01T00:00:00Z",
        dateTo: "2024-01-31T23:59:59Z",
        selectedCalendars,
      });

      // Should only include the active event, not the cancelled one
      expect(availability).toHaveLength(1);
      expect(availability[0].title).toBe("Active Event");
    });

    test("should not duplicate recurring event exceptions", async () => {
      // Create a recurring event with an exception (moved occurrence)
      const icsData = createICSData([
        // Weekly recurring event starting Jan 8 (Monday)
        createRecurringEvent(
          "recurring-event",
          "Weekly Meeting",
          "20240108T100000Z",
          "20240108T110000Z",
          "FREQ=WEEKLY;BYDAY=MO;COUNT=4"
        ),
        // Exception: Jan 15 occurrence moved to Jan 16
        createRecurringEventException(
          "recurring-event",
          "Weekly Meeting (Moved)",
          "20240115T100000Z",
          "20240116T100000Z",
          "20240116T110000Z"
        ),
      ]);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve(icsData),
      });

      const BuildCalendarService = (await import("../CalendarService")).default;
      const service = BuildCalendarService({
        id: 1,
        userId: 1,
        appId: "ics-feed",
        type: "ics-feed_calendar",
        key: "encrypted-key",
        invalid: false,
        teamId: null,
      });

      const selectedCalendars: IntegrationCalendar[] = [
        {
          externalId: "https://example.com/calendar1.ics",
          integration: "ics-feed_calendar",
          name: "Calendar 1",
          userId: 1,
        },
      ];

      const availability = await service.getAvailability({
        dateFrom: "2024-01-01T00:00:00Z",
        dateTo: "2024-01-31T23:59:59Z",
        selectedCalendars,
      });

      // Check that we don't have duplicate events
      // The recurring event should generate occurrences, and the exception
      // should NOT be processed separately (it has RECURRENCE-ID)
      const jan15Events = availability.filter((e) => e.start.includes("2024-01-15"));
      const _jan16Events = availability.filter((e) => e.start.includes("2024-01-16"));

      // With proper handling, Jan 15 should have at most 1 occurrence
      // (the moved occurrence is handled by ICAL.js internally)
      expect(jan15Events.length).toBeLessThanOrEqual(1);
    });

    test("should handle cancelled status with different casing", async () => {
      const icsDataLowercase = createICSData([
        `BEGIN:VEVENT
UID:event-lowercase
SUMMARY:Lowercase Cancelled
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
STATUS:cancelled
END:VEVENT`,
      ]);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve(icsDataLowercase),
      });

      const BuildCalendarService = (await import("../CalendarService")).default;
      const service = BuildCalendarService({
        id: 1,
        userId: 1,
        appId: "ics-feed",
        type: "ics-feed_calendar",
        key: "encrypted-key",
        invalid: false,
        teamId: null,
      });

      const selectedCalendars: IntegrationCalendar[] = [
        {
          externalId: "https://example.com/calendar1.ics",
          integration: "ics-feed_calendar",
          name: "Calendar 1",
          userId: 1,
        },
      ];

      const availability = await service.getAvailability({
        dateFrom: "2024-01-01T00:00:00Z",
        dateTo: "2024-01-31T23:59:59Z",
        selectedCalendars,
      });

      // Should ignore the cancelled event regardless of casing
      expect(availability).toHaveLength(0);
    });

    test("should efficiently process recurring events starting before date range", async () => {
      // Recurring event that started 2 years ago
      const icsData = createICSData([
        createRecurringEvent(
          "old-recurring",
          "Old Weekly Meeting",
          "20220101T100000Z", // Started in 2022
          "20220101T110000Z",
          "FREQ=WEEKLY;BYDAY=SA" // Every Saturday, no end
        ),
      ]);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve(icsData),
      });

      const BuildCalendarService = (await import("../CalendarService")).default;
      const service = BuildCalendarService({
        id: 1,
        userId: 1,
        appId: "ics-feed",
        type: "ics-feed_calendar",
        key: "encrypted-key",
        invalid: false,
        teamId: null,
      });

      const selectedCalendars: IntegrationCalendar[] = [
        {
          externalId: "https://example.com/calendar1.ics",
          integration: "ics-feed_calendar",
          name: "Calendar 1",
          userId: 1,
        },
      ];

      // Query for a week in Jan 2024 (2 years after event started)
      const startTime = performance.now();
      const availability = await service.getAvailability({
        dateFrom: "2024-01-01T00:00:00Z",
        dateTo: "2024-01-07T23:59:59Z",
        selectedCalendars,
      });
      const endTime = performance.now();

      // Should complete quickly (under 100ms) because it starts iterating from rangeStart
      // not from the original event start date in 2022
      expect(endTime - startTime).toBeLessThan(100);

      // Should find the Saturday occurrence in the range (Jan 6, 2024 is a Saturday)
      expect(availability.length).toBeGreaterThan(0);
      expect(availability.some((e) => e.start.includes("2024-01-06"))).toBe(true);
    });

    test("should return empty array when no calendars are selected", async () => {
      const icsData = createICSData([
        createSimpleEvent("event1", "Event", "20240115T100000Z", "20240115T110000Z"),
      ]);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve(icsData),
      });

      const BuildCalendarService = (await import("../CalendarService")).default;
      const service = BuildCalendarService({
        id: 1,
        userId: 1,
        appId: "ics-feed",
        type: "ics-feed_calendar",
        key: "encrypted-key",
        invalid: false,
        teamId: null,
      });

      // No matching calendars selected
      const selectedCalendars: IntegrationCalendar[] = [
        {
          externalId: "https://example.com/non-existent.ics",
          integration: "ics-feed_calendar",
          name: "Non-existent Calendar",
          userId: 1,
        },
      ];

      const availability = await service.getAvailability({
        dateFrom: "2024-01-01T00:00:00Z",
        dateTo: "2024-01-31T23:59:59Z",
        selectedCalendars,
      });

      expect(availability).toHaveLength(0);
    });

    test("should return recurring event occurrences only within the date range", async () => {
      // Test that recurring events are properly filtered to the date range
      const icsData = createICSData([
        createRecurringEvent(
          "weekly-meeting",
          "Weekly Meeting",
          "20240101T100000Z", // Starts Jan 1
          "20240101T110000Z",
          "FREQ=WEEKLY;BYDAY=MO;COUNT=8" // 8 occurrences
        ),
      ]);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve(icsData),
      });

      const BuildCalendarService = (await import("../CalendarService")).default;
      const service = BuildCalendarService({
        id: 1,
        userId: 1,
        appId: "ics-feed",
        type: "ics-feed_calendar",
        key: "encrypted-key",
        invalid: false,
        teamId: null,
      });

      const selectedCalendars: IntegrationCalendar[] = [
        {
          externalId: "https://example.com/calendar1.ics",
          integration: "ics-feed_calendar",
          name: "Calendar 1",
          userId: 1,
        },
      ];

      // Only query for the first 2 weeks of January
      const availability = await service.getAvailability({
        dateFrom: "2024-01-01T00:00:00Z",
        dateTo: "2024-01-14T23:59:59Z",
        selectedCalendars,
      });

      // Should only include occurrences within the 2-week range
      // Jan 1, Jan 8 are Mondays in this range
      expect(availability.length).toBeGreaterThanOrEqual(1);
      expect(availability.length).toBeLessThanOrEqual(2);

      // All events should be within the date range
      availability.forEach((event) => {
        const eventStart = new Date(event.start);
        expect(eventStart >= new Date("2024-01-01T00:00:00Z")).toBe(true);
        expect(eventStart <= new Date("2024-01-14T23:59:59Z")).toBe(true);
      });
    });
  });
});
