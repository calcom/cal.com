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
  });
});
