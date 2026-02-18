import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEvent as createIcsEvent } from "ics";
import { createCalendarObject, updateCalendarObject } from "tsdav";

vi.mock("ics", () => ({
  createEvent: vi.fn(),
}));

vi.mock("tsdav", () => ({
  createAccount: vi.fn(),
  fetchCalendars: vi.fn(),
  fetchCalendarObjects: vi.fn(),
  createCalendarObject: vi.fn().mockResolvedValue({ ok: true }),
  updateCalendarObject: vi.fn().mockResolvedValue({ status: 200 }),
  deleteCalendarObject: vi.fn(),
  getBasicAuthHeaders: vi.fn().mockReturnValue({}),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: vi.fn().mockImplementation((text) => {
    if (typeof text === "object") {
      return JSON.stringify(text);
    }
    return text;
  }),
}));

vi.mock("./CalEventParser", () => ({
  getLocation: vi.fn().mockReturnValue("Test Location"),
  getRichDescription: vi.fn().mockReturnValue("Test Description"),
}));

import type { CalendarServiceEvent } from "@calcom/types/Calendar";

import BaseCalendarService from "./CalendarService";

const createMockEvent = (overrides: Partial<CalendarServiceEvent> = {}): CalendarServiceEvent => ({
  type: "caldav",
  title: "Test Event",
  startTime: "2023-01-01T10:00:00Z",
  endTime: "2023-01-01T11:00:00Z",
  organizer: {
    name: "Test",
    email: "test@example.com",
    timeZone: "UTC",
    language: { translate: ((key: string) => key) as never, locale: "en" },
  },
  attendees: [],
  calendarDescription: "Test Description",
  ...overrides,
});

class TestCalendarService extends BaseCalendarService {
  constructor() {
    super(
      {
        id: 1,
        type: "caldav_calendar",
        delegationCredentialId: null,
        user: { email: "test@example.com" },
        userId: 1,
        teamId: null,
        appId: "caldav",
        invalid: false,
        key: {
          username: "test",
          password: "test",
          url: "https://caldav.example.com",
        },
      },
      "caldav",
      "https://caldav.example.com"
    );
  }

  async listCalendars() {
    return [
      {
        externalId: "https://caldav.example.com/calendar/",
        name: "Test Calendar",
        primary: true,
        readOnly: false,
        email: "test@example.com",
        integrationName: "caldav",
        credentialId: 1,
      },
    ];
  }

  async testUpdateEvent(uid: string, event: CalendarServiceEvent, externalCalendarId: string) {
    return this.updateEvent(uid, event);
  }
}

describe("CalendarService - SCHEDULE-AGENT injection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("injectScheduleAgent", () => {
    it("should inject SCHEDULE-AGENT=CLIENT into ATTENDEE lines", async () => {
      const service = new TestCalendarService();
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nMETHOD:PUBLISH\r\nATTENDEE;CN=Guest:mailto:guest@example.com\r\nEND:VCALENDAR`;
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

      const event = createMockEvent();

      await service.createEvent(event, 1);

      const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
      const iCalString = calledArg.iCalString;
      const unfolded = iCalString.replace(/\r?\n[ \t]/g, "");

      expect(unfolded).toContain("ATTENDEE;CN=Guest;SCHEDULE-AGENT=CLIENT:mailto:guest@example.com");
      expect(unfolded).not.toContain("METHOD:PUBLISH");
    });

    it("should inject SCHEDULE-AGENT=CLIENT into ORGANIZER lines", async () => {
      const service = new TestCalendarService();
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nORGANIZER;CN=Test:mailto:test@example.com\r\nATTENDEE;CN=Guest:mailto:guest@example.com\r\nEND:VCALENDAR`;
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

      const event = createMockEvent();

      await service.createEvent(event, 1);

      const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
      const iCalString = calledArg.iCalString;
      const unfolded = iCalString.replace(/\r?\n[ \t]/g, "");

      expect(unfolded).toContain("ORGANIZER;CN=Test;SCHEDULE-AGENT=CLIENT:mailto:test@example.com");
      expect(unfolded).toContain("ATTENDEE;CN=Guest;SCHEDULE-AGENT=CLIENT:mailto:guest@example.com");
    });

    it("should not duplicate SCHEDULE-AGENT if already present", async () => {
      const service = new TestCalendarService();
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nATTENDEE;SCHEDULE-AGENT=SERVER;CN=Guest:mailto:guest@example.com\r\nEND:VCALENDAR`;
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

      const event = createMockEvent();

      await service.createEvent(event, 1);

      const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
      const iCalString = calledArg.iCalString;

      const scheduleAgentCount = (iCalString.match(/SCHEDULE-AGENT/g) || []).length;
      expect(scheduleAgentCount).toBe(1);
    });

    it("should handle quoted colons in CN parameter", async () => {
      const service = new TestCalendarService();
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nATTENDEE;CN="John: CEO":mailto:john@example.com\r\nEND:VCALENDAR`;
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

      const event = createMockEvent();

      await service.createEvent(event, 1);

      const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
      const iCalString = calledArg.iCalString;
      const unfolded = iCalString.replace(/\r?\n[ \t]/g, "");

      expect(unfolded).toContain('ATTENDEE;CN="John: CEO";SCHEDULE-AGENT=CLIENT:mailto:john@example.com');
    });

    it("should remove METHOD:PUBLISH per RFC 4791", async () => {
      const service = new TestCalendarService();
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nMETHOD:PUBLISH\r\nATTENDEE;CN=Guest:mailto:guest@example.com\r\nEND:VCALENDAR`;
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

      const event = createMockEvent();

      await service.createEvent(event, 1);

      const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
      const iCalString = calledArg.iCalString;

      expect(iCalString).not.toContain("METHOD:PUBLISH");
    });

    it("should handle case-insensitive ATTENDEE matching", async () => {
      const service = new TestCalendarService();
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nattendee;cn=Guest:mailto:guest@example.com\r\nEND:VCALENDAR`;
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

      const event = createMockEvent();

      await service.createEvent(event, 1);

      const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
      const iCalString = calledArg.iCalString;
      const unfolded = iCalString.replace(/\r?\n[ \t]/g, "");

      expect(unfolded).toContain("SCHEDULE-AGENT=CLIENT");
    });
  });

  describe("RFC 5545 Line Folding", () => {
    it("should fold long lines at 75 octets", async () => {
      const service = new TestCalendarService();
      const longName = "A".repeat(60);
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nATTENDEE;CN=${longName}:mailto:guest@example.com\r\nEND:VCALENDAR`;
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

      const event = createMockEvent();

      await service.createEvent(event, 1);

      const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
      const iCalString = calledArg.iCalString;
      const lines = iCalString.split("\r\n");

      lines.forEach((line) => {
        const byteLength = new TextEncoder().encode(line).length;
        expect(byteLength).toBeLessThanOrEqual(75);
      });
    });

    it("should handle UTF-8 multi-byte characters correctly", async () => {
      const service = new TestCalendarService();
      const unicodeName = "\u4E2D".repeat(30);
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nORGANIZER;CN=${unicodeName}:mailto:test@example.com\r\nEND:VCALENDAR`;
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

      const event = createMockEvent();

      await service.createEvent(event, 1);

      const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
      const iCalString = calledArg.iCalString;
      const lines = iCalString.split("\r\n");

      lines.forEach((line) => {
        const byteLength = new TextEncoder().encode(line).length;
        expect(byteLength).toBeLessThanOrEqual(75);
      });

      const unfolded = iCalString.replace(/\r?\n[ \t]/g, "");
      expect(unfolded).toContain("SCHEDULE-AGENT=CLIENT");
    });

    it("should handle folded input lines correctly", async () => {
      const service = new TestCalendarService();
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nATTENDEE;CN=Very Long Name That Will Be\r\n  Folded:mailto:guest@example.com\r\nEND:VCALENDAR`;
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

      const event = createMockEvent();

      await service.createEvent(event, 1);

      const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
      const iCalString = calledArg.iCalString;
      const unfolded = iCalString.replace(/\r?\n[ \t]/g, "");

      expect(unfolded).toContain("SCHEDULE-AGENT=CLIENT");
    });
  });

  describe("updateEvent", () => {
    it("should inject SCHEDULE-AGENT=CLIENT on update", async () => {
      const service = new TestCalendarService();
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nATTENDEE;CN=Guest:mailto:guest@example.com\r\nEND:VCALENDAR`;
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

      (service as unknown as Record<string, unknown>).getEventsByUID = vi.fn().mockResolvedValue([
        {
          uid: "test-uid",
          url: "https://caldav.example.com/calendar/test.ics",
          etag: '"etag123"',
        },
      ]);

      const event = createMockEvent({ uid: "test-uid" });

      await service.testUpdateEvent("test-uid", event, "https://caldav.example.com/calendar/");

      const calledArg = vi.mocked(updateCalendarObject).mock.calls[0][0];
      const data = calledArg.calendarObject.data;
      const unfolded = data.replace(/\r?\n[ \t]/g, "");

      expect(unfolded).toContain("SCHEDULE-AGENT=CLIENT");
    });
  });

  describe("Edge cases", () => {
    it("should handle ATTENDEE with multiple parameters", async () => {
      const service = new TestCalendarService();
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nATTENDEE;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=Guest:mailto:guest@example.com\r\nEND:VCALENDAR`;
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

      const event = createMockEvent();

      await service.createEvent(event, 1);

      const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
      const iCalString = calledArg.iCalString;
      const unfolded = iCalString.replace(/\r?\n[ \t]/g, "");

      expect(unfolded).toContain("PARTSTAT=NEEDS-ACTION");
      expect(unfolded).toContain("RSVP=TRUE");
      expect(unfolded).toContain("SCHEDULE-AGENT=CLIENT");
    });

    it("should handle ATTENDEE with http URI", async () => {
      const service = new TestCalendarService();
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nATTENDEE;CN=Guest:http://example.com/user\r\nEND:VCALENDAR`;
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

      const event = createMockEvent();

      await service.createEvent(event, 1);

      const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
      const iCalString = calledArg.iCalString;
      const unfolded = iCalString.replace(/\r?\n[ \t]/g, "");

      expect(unfolded).toContain("ATTENDEE;CN=Guest;SCHEDULE-AGENT=CLIENT:http://example.com/user");
    });

    it("should preserve other iCal properties unchanged", async () => {
      const service = new TestCalendarService();
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Cal.com//NONSGML//EN\r\nATTENDEE;CN=Guest:mailto:guest@example.com\r\nDTSTART:20230101T100000Z\r\nDTEND:20230101T110000Z\r\nEND:VCALENDAR`;
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

      const event = createMockEvent();

      await service.createEvent(event, 1);

      const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
      const iCalString = calledArg.iCalString;

      expect(iCalString).toContain("VERSION:2.0");
      expect(iCalString).toContain("PRODID:-//Cal.com//NONSGML//EN");
      expect(iCalString).toContain("DTSTART:20230101T100000Z");
      expect(iCalString).toContain("DTEND:20230101T110000Z");
    });

    it("should handle empty iCalString gracefully", async () => {
      const service = new TestCalendarService();
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: "",
      });

      const event = createMockEvent();

      await expect(service.createEvent(event, 1)).rejects.toThrow();
    });
  });
});

// ─── getAvailability — Zimbra/non-standard TZID tests ────────────────────────

import { fetchCalendarObjects } from "tsdav";

// Minimal ICS helpers for getAvailability tests
const makeZimbraIcs = (startLocal: string, endLocal: string, tzid: string) => `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VTIMEZONE
TZID:${tzid}
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:+0100
TZOFFSETTO:+0100
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
DTSTART;TZID=${tzid}:${startLocal}
DTEND;TZID=${tzid}:${endLocal}
SUMMARY:Zimbra Test
END:VEVENT
END:VCALENDAR`;

// Zimbra-style ICS where TZID in DTSTART uses a vendor-prefixed form
// but the VTIMEZONE component uses the plain IANA name.
const makeZimbraVendorIcs = (startLocal: string, endLocal: string, ianaName: string) => `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VTIMEZONE
TZID:${ianaName}
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:+0100
TZOFFSETTO:+0100
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
DTSTART;TZID=/zimbra.com/standard/${ianaName}:${startLocal}
DTEND;TZID=/zimbra.com/standard/${ianaName}:${endLocal}
SUMMARY:Zimbra Vendor TZID Test
END:VEVENT
END:VCALENDAR`;

describe("CalendarService - getAvailability timezone handling", () => {
  let service: TestCalendarService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TestCalendarService();
    (service as unknown as Record<string, unknown>).getUserTimezoneFromDB = vi.fn().mockResolvedValue("UTC");
  });

  it("should return correct start/end for non-recurring event with VTIMEZONE (no double-conversion)", async () => {
    // Event: 09:00–09:15 Europe/Berlin (UTC+1 → 08:00–08:15 UTC)
    const ics = makeZimbraIcs("20260105T090000", "20260105T091500", "Europe/Berlin");
    vi.mocked(fetchCalendarObjects).mockResolvedValue([
      { data: ics, url: "https://example.com/event.ics", etag: '"1"' } as any,
    ]);

    const result = await service.getAvailability({
      dateFrom: "2026-01-05",
      dateTo: "2026-01-06",
      selectedCalendars: [
        {
          externalId: "https://example.com/calendar/",
          name: "Test",
          primary: true,
          readOnly: false,
          email: "test@example.com",
          integrationName: "caldav",
          credentialId: 1,
          userId: 1,
        },
      ],
    });

    expect(result).toHaveLength(1);
    const startHour = new Date(result[0].start).getUTCHours();
    const endHour = new Date(result[0].end).getUTCHours();
    const endMin = new Date(result[0].end).getUTCMinutes();

    // start must be 08:00 UTC (09:00 Berlin - 1h offset), NOT 10:00 UTC (double-converted)
    expect(startHour).toBe(8);
    // end must be AFTER start (08:15 UTC), not before (which would indicate double-conversion)
    expect(new Date(result[0].end).getTime()).toBeGreaterThan(new Date(result[0].start).getTime());
    expect(endHour).toBe(8);
    expect(endMin).toBe(15);
  });

  it("should handle Zimbra vendor-prefixed TZID (e.g. /zimbra.com/standard/Europe/Berlin)", async () => {
    // Zimbra uses DTSTART;TZID=/zimbra.com/standard/Europe/Berlin but VTIMEZONE has TZID:Europe/Berlin
    // The lookup by exact match would fail; fallback to IANA suffix extraction must work.
    const ics = makeZimbraVendorIcs("20260105T090000", "20260105T091500", "Europe/Berlin");
    vi.mocked(fetchCalendarObjects).mockResolvedValue([
      { data: ics, url: "https://example.com/event.ics", etag: '"1"' } as any,
    ]);

    const result = await service.getAvailability({
      dateFrom: "2026-01-05",
      dateTo: "2026-01-06",
      selectedCalendars: [
        {
          externalId: "https://example.com/calendar/",
          name: "Test",
          primary: true,
          readOnly: false,
          email: "test@example.com",
          integrationName: "caldav",
          credentialId: 1,
          userId: 1,
        },
      ],
    });

    // Should return 1 event; end must be after start (positive duration)
    expect(result).toHaveLength(1);
    expect(new Date(result[0].end).getTime()).toBeGreaterThan(new Date(result[0].start).getTime());
  });
});
