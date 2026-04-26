import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: vi.fn((_key: string, _secret: string) =>
    JSON.stringify({ urls: ["https://calendar.proton.me/api/calendar/v1/url/test/calendar.ics"] })
  ),
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ timeZone: "Europe/London" }),
    },
  },
}));

import { symmetricDecrypt } from "@calcom/lib/crypto";
import type { CredentialPayload } from "@calcom/types/Credential";
import BuildCalendarService from "../CalendarService";

const SIMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Proton AG//ProtonCalendar//EN
X-WR-CALNAME:My Proton Calendar
BEGIN:VEVENT
UID:simple-event-1
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
SUMMARY:Morning standup
END:VEVENT
END:VCALENDAR`;

const GHOST_EVENT_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Proton AG//ProtonCalendar//EN
BEGIN:VEVENT
UID:ghost-event-1
DTSTART:20240115T140000Z
DTEND:20240115T150000Z
SUMMARY:Cancelled meeting
STATUS:CANCELLED
END:VEVENT
BEGIN:VEVENT
UID:normal-event-1
DTSTART:20240115T160000Z
DTEND:20240115T170000Z
SUMMARY:Real meeting
END:VEVENT
END:VCALENDAR`;

const MULTI_EVENT_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Proton AG//ProtonCalendar//EN
BEGIN:VEVENT
UID:event-a
DTSTART:20240115T090000Z
DTEND:20240115T093000Z
SUMMARY:Event A
END:VEVENT
BEGIN:VEVENT
UID:event-b
DTSTART:20240115T120000Z
DTEND:20240115T130000Z
SUMMARY:Event B
END:VEVENT
BEGIN:VEVENT
UID:event-c
DTSTART:20240120T120000Z
DTEND:20240120T130000Z
SUMMARY:Event C outside range
END:VEVENT
END:VCALENDAR`;

const mockCredential: CredentialPayload = {
  id: 1,
  type: "proton-calendar_calendar",
  key: "encrypted-key-placeholder",
  userId: 1,
  teamId: null,
  appId: "proton-calendar",
  invalid: false,
  user: { email: "test@example.com" },
  delegationCredentialId: null,
  encryptedKey: null,
};

function mockFetchResponse(body: string, ok = true, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    text: () => Promise.resolve(body),
  });
}

describe("ProtonCalendarService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("throws when credential key is missing", () => {
      const credentialWithoutKey = { ...mockCredential, key: null };
      expect(() => BuildCalendarService(credentialWithoutKey)).toThrow(
        "Missing Proton Calendar credential key"
      );
    });

    it("degrades gracefully when credential data is malformed", async () => {
      vi.mocked(symmetricDecrypt).mockReturnValueOnce("not-valid-json");
      const service = BuildCalendarService(mockCredential);
      mockFetchResponse(SIMPLE_ICS);
      const calendars = await service.listCalendars();
      expect(calendars).toHaveLength(0);
    });

    it("degrades gracefully when urls is not a string array", async () => {
      vi.mocked(symmetricDecrypt).mockReturnValueOnce(JSON.stringify({ urls: [123, null] }));
      const service = BuildCalendarService(mockCredential);
      mockFetchResponse(SIMPLE_ICS);
      const calendars = await service.listCalendars();
      expect(calendars).toHaveLength(0);
    });
  });

  describe("createEvent", () => {
    it("returns read-only warning", async () => {
      const service = BuildCalendarService(mockCredential);
      const result = await service.createEvent(
        { uid: "test-uid" } as Parameters<typeof service.createEvent>[0],
        1
      );
      expect(result).toMatchObject({
        uid: "test-uid",
        type: "proton-calendar_calendar",
        additionalInfo: { calWarnings: ["Proton Calendar is read-only"] },
      });
    });
  });

  describe("updateEvent", () => {
    it("returns read-only warning", async () => {
      const service = BuildCalendarService(mockCredential);
      const result = await service.updateEvent("uid", { uid: "test-uid" } as Parameters<
        typeof service.updateEvent
      >[1]);
      expect(result).toMatchObject({
        additionalInfo: { calWarnings: ["Proton Calendar is read-only"] },
      });
    });
  });

  describe("deleteEvent", () => {
    it("resolves without error", async () => {
      const service = BuildCalendarService(mockCredential);
      await expect(
        service.deleteEvent("uid", {} as Parameters<typeof service.deleteEvent>[1])
      ).resolves.toBeUndefined();
    });
  });

  describe("listCalendars", () => {
    it("returns calendars with correct metadata", async () => {
      mockFetchResponse(SIMPLE_ICS);
      const service = BuildCalendarService(mockCredential);
      const calendars = await service.listCalendars();

      expect(calendars).toHaveLength(1);
      expect(calendars[0]).toMatchObject({
        name: "My Proton Calendar",
        readOnly: true,
        integration: "proton-calendar_calendar",
      });
    });

    it("falls back to 'Proton Calendar' when X-WR-CALNAME is missing", async () => {
      const icsWithoutName = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Proton AG//ProtonCalendar//EN
BEGIN:VEVENT
UID:test-1
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
SUMMARY:Test
END:VEVENT
END:VCALENDAR`;
      mockFetchResponse(icsWithoutName);
      const service = BuildCalendarService(mockCredential);
      const calendars = await service.listCalendars();

      expect(calendars[0].name).toBe("Proton Calendar");
    });

    it("handles fetch failure gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
      const service = BuildCalendarService(mockCredential);
      const calendars = await service.listCalendars();

      expect(calendars).toHaveLength(0);
    });

    it("handles HTTP error response gracefully", async () => {
      mockFetchResponse("", false, 403);
      const service = BuildCalendarService(mockCredential);
      const calendars = await service.listCalendars();

      expect(calendars).toHaveLength(0);
    });
  });

  describe("getAvailability", () => {
    it("returns all non-recurring events from the feed", async () => {
      mockFetchResponse(MULTI_EVENT_ICS);
      const service = BuildCalendarService(mockCredential);
      const events = await service.getAvailability({
        dateFrom: "2024-01-15T00:00:00Z",
        dateTo: "2024-01-16T00:00:00Z",
        selectedCalendars: [{ userId: 1, integration: "proton-calendar_calendar", externalId: "url" }],
      });

      // Non-recurring events are returned as-is; date filtering happens upstream in Cal.com
      const titles = events.map((e) => e.title);
      expect(titles).toContain("Event A");
      expect(titles).toContain("Event B");
      expect(titles).toContain("Event C outside range");
      expect(events).toHaveLength(3);
    });

    it("filters out ghost events with STATUS:CANCELLED", async () => {
      mockFetchResponse(GHOST_EVENT_ICS);
      const service = BuildCalendarService(mockCredential);
      const events = await service.getAvailability({
        dateFrom: "2024-01-15T00:00:00Z",
        dateTo: "2024-01-16T00:00:00Z",
        selectedCalendars: [{ userId: 1, integration: "proton-calendar_calendar", externalId: "url" }],
      });

      expect(events).toHaveLength(1);
      expect(events[0].title).toBe("Real meeting");
    });

    it("filters entire event series when UID-only cancellation exists", async () => {
      const cancelledSeriesIcs = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:series-cancel-1
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
SUMMARY:Cancelled series event
STATUS:CANCELLED
END:VEVENT
BEGIN:VEVENT
UID:series-cancel-1
DTSTART:20240115T140000Z
DTEND:20240115T150000Z
SUMMARY:Another instance
END:VEVENT
END:VCALENDAR`;
      mockFetchResponse(cancelledSeriesIcs);
      const service = BuildCalendarService(mockCredential);
      const events = await service.getAvailability({
        dateFrom: "2024-01-15T00:00:00Z",
        dateTo: "2024-01-16T00:00:00Z",
        selectedCalendars: [{ userId: 1, integration: "proton-calendar_calendar", externalId: "url" }],
      });

      expect(events).toHaveLength(0);
    });

    it("filters specific recurring instance cancelled via RECURRENCE-ID", async () => {
      const recurrenceIdCancelIcs = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:recurring-1
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
SUMMARY:Weekly standup
RRULE:FREQ=DAILY;COUNT=3
END:VEVENT
BEGIN:VEVENT
UID:recurring-1
RECURRENCE-ID:20240116T100000Z
DTSTART:20240116T100000Z
DTEND:20240116T110000Z
SUMMARY:Weekly standup
STATUS:CANCELLED
END:VEVENT
END:VCALENDAR`;
      mockFetchResponse(recurrenceIdCancelIcs);
      const service = BuildCalendarService(mockCredential);
      const events = await service.getAvailability({
        dateFrom: "2024-01-15T00:00:00Z",
        dateTo: "2024-01-18T00:00:00Z",
        selectedCalendars: [{ userId: 1, integration: "proton-calendar_calendar", externalId: "url" }],
      });

      const dates = events.map((e) => new Date(e.start).toISOString().slice(8, 10));
      expect(dates).toContain("15");
      expect(dates).not.toContain("16");
      expect(dates).toContain("17");
    });

    it("uses 'Busy' as fallback title when SUMMARY is missing", async () => {
      const noSummaryIcs = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:no-summary-1
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
END:VEVENT
END:VCALENDAR`;
      mockFetchResponse(noSummaryIcs);
      const service = BuildCalendarService(mockCredential);
      const events = await service.getAvailability({
        dateFrom: "2024-01-15T00:00:00Z",
        dateTo: "2024-01-16T00:00:00Z",
        selectedCalendars: [],
      });

      expect(events[0].title).toBe("Busy");
    });

    it("returns empty array when fetch fails", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("timeout"));
      const service = BuildCalendarService(mockCredential);
      const events = await service.getAvailability({
        dateFrom: "2024-01-15T00:00:00Z",
        dateTo: "2024-01-16T00:00:00Z",
        selectedCalendars: [],
      });

      expect(events).toEqual([]);
    });

    it("handles invalid ICS data gracefully", async () => {
      mockFetchResponse("this is not valid ics data");
      const service = BuildCalendarService(mockCredential);
      const events = await service.getAvailability({
        dateFrom: "2024-01-15T00:00:00Z",
        dateTo: "2024-01-16T00:00:00Z",
        selectedCalendars: [],
      });

      expect(events).toEqual([]);
    });

    it("handles events with unrecognized travel duration gracefully", async () => {
      const travelIcs = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:travel-1
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
SUMMARY:Meeting with travel
X-APPLE-TRAVEL-DURATION:PT1800S
END:VEVENT
END:VCALENDAR`;
      mockFetchResponse(travelIcs);
      const service = BuildCalendarService(mockCredential);
      const events = await service.getAvailability({
        dateFrom: "2024-01-15T00:00:00Z",
        dateTo: "2024-01-16T00:00:00Z",
        selectedCalendars: [],
      });

      expect(events).toHaveLength(1);
      expect(events[0].title).toBe("Meeting with travel");
    });

    it("handles events with explicit VTIMEZONE", async () => {
      const tzIcs = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VTIMEZONE
TZID:CustomTZ
BEGIN:STANDARD
TZOFFSETFROM:+0000
TZOFFSETTO:+0000
DTSTART:19700101T000000
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:tz-event-1
DTSTART;TZID=CustomTZ:20240115T100000
DTEND;TZID=CustomTZ:20240115T110000
SUMMARY:Timezone meeting
END:VEVENT
END:VCALENDAR`;
      mockFetchResponse(tzIcs);
      const service = BuildCalendarService(mockCredential);
      const events = await service.getAvailability({
        dateFrom: "2024-01-15T00:00:00Z",
        dateTo: "2024-01-16T00:00:00Z",
        selectedCalendars: [{ userId: 1, integration: "proton-calendar_calendar", externalId: "url" }],
      });

      expect(events).toHaveLength(1);
      expect(events[0].title).toBe("Timezone meeting");
    });

    it("creates synthetic VTIMEZONE per distinct TZID in feeds without one", async () => {
      const multiTzIcs = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:tz-a
DTSTART;TZID=Etc/GMT-2:20240115T100000
DTEND;TZID=Etc/GMT-2:20240115T110000
SUMMARY:Event in GMT+2
END:VEVENT
BEGIN:VEVENT
UID:tz-b
DTSTART;TZID=Etc/GMT-5:20240115T140000
DTEND;TZID=Etc/GMT-5:20240115T150000
SUMMARY:Event in GMT+5
END:VEVENT
END:VCALENDAR`;
      mockFetchResponse(multiTzIcs);
      const service = BuildCalendarService(mockCredential);
      const events = await service.getAvailability({
        dateFrom: "2024-01-14T00:00:00Z",
        dateTo: "2024-01-16T00:00:00Z",
        selectedCalendars: [{ userId: 1, integration: "proton-calendar_calendar", externalId: "url" }],
      });

      expect(events).toHaveLength(2);
      const titles = events.map((e) => e.title);
      expect(titles).toContain("Event in GMT+2");
      expect(titles).toContain("Event in GMT+5");
    });

    it("handles daily recurring events within date range", async () => {
      const dailyIcs = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:daily-1
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
SUMMARY:Daily standup
RRULE:FREQ=DAILY;COUNT=5
END:VEVENT
END:VCALENDAR`;
      mockFetchResponse(dailyIcs);
      const service = BuildCalendarService(mockCredential);
      const events = await service.getAvailability({
        dateFrom: "2024-01-15T00:00:00Z",
        dateTo: "2024-01-20T00:00:00Z",
        selectedCalendars: [],
      });

      expect(events).toHaveLength(5);
      const dates = events.map((e) => new Date(e.start).getUTCDate());
      expect(dates).toEqual([15, 16, 17, 18, 19]);
    });
  });
});
