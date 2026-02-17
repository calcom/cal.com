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
  startTime: "2023-06-15T15:00:00Z",
  endTime: "2023-06-15T16:00:00Z",
  organizer: {
    name: "Test",
    email: "test@example.com",
    timeZone: "America/Chicago",
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

// ============================================================================
// Bug Fix #2: UID Consistency Tests
// ============================================================================
describe("CalendarService - UID Consistency (Bug Fix #2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use event.uid when provided, not generate a new UUID", async () => {
    const service = new TestCalendarService();
    const bookingUid = "booking-uid-from-database-abc123";
    const mockIcsOutput = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:${bookingUid}\r\nDTSTART:20230615T150000Z\r\nDTEND:20230615T160000Z\r\nEND:VEVENT\r\nEND:VCALENDAR`;

    vi.mocked(createIcsEvent).mockReturnValue({
      error: null as unknown as Error,
      value: mockIcsOutput,
    });

    const event = createMockEvent({ uid: bookingUid });
    const result = await service.createEvent(event, 1);

    // The returned uid should match the booking uid
    expect(result.uid).toBe(bookingUid);
    expect(result.id).toBe(bookingUid);

    // The CalDAV object should be stored with the booking uid as the filename
    const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
    expect(calledArg.filename).toBe(`${bookingUid}.ics`);

    // The uid passed to ics.createEvent should be the booking uid
    const icsCallArg = vi.mocked(createIcsEvent).mock.calls[0][0];
    expect(icsCallArg.uid).toBe(bookingUid);
  });

  it("should generate a new UUID when event.uid is not provided", async () => {
    const service = new TestCalendarService();
    const mockIcsOutput = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:generated-uuid\r\nDTSTART:20230615T150000Z\r\nDTEND:20230615T160000Z\r\nEND:VEVENT\r\nEND:VCALENDAR`;

    vi.mocked(createIcsEvent).mockReturnValue({
      error: null as unknown as Error,
      value: mockIcsOutput,
    });

    // No uid provided
    const event = createMockEvent({ uid: undefined });
    const result = await service.createEvent(event, 1);

    // Should still get a uid back (generated one)
    expect(result.uid).toBeTruthy();
    expect(typeof result.uid).toBe("string");
    expect(result.uid.length).toBeGreaterThan(0);
  });

  it("should use event.uid=null as falsy — falls back to generated UUID", async () => {
    const service = new TestCalendarService();
    const mockIcsOutput = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:generated-uuid\r\nDTSTART:20230615T150000Z\r\nDTEND:20230615T160000Z\r\nEND:VEVENT\r\nEND:VCALENDAR`;

    vi.mocked(createIcsEvent).mockReturnValue({
      error: null as unknown as Error,
      value: mockIcsOutput,
    });

    const event = createMockEvent({ uid: null });
    const result = await service.createEvent(event, 1);

    // Should still produce a valid uid
    expect(result.uid).toBeTruthy();
  });

  it("should use the same uid for the CalDAV filename and the ics UID property", async () => {
    const service = new TestCalendarService();
    const bookingUid = "consistent-uid-xyz789";
    const mockIcsOutput = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:${bookingUid}\r\nDTSTART:20230615T150000Z\r\nDTEND:20230615T160000Z\r\nEND:VEVENT\r\nEND:VCALENDAR`;

    vi.mocked(createIcsEvent).mockReturnValue({
      error: null as unknown as Error,
      value: mockIcsOutput,
    });

    const event = createMockEvent({ uid: bookingUid });
    await service.createEvent(event, 1);

    // Verify uid passed to ics matches uid used for filename
    const icsCallArg = vi.mocked(createIcsEvent).mock.calls[0][0];
    const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];

    expect(icsCallArg.uid).toBe(bookingUid);
    expect(calledArg.filename).toBe(`${bookingUid}.ics`);
    // Both should be the same uid
    expect(icsCallArg.uid).toBe(calledArg.filename?.replace(".ics", ""));
  });
});

// ============================================================================
// Bug Fix #3: VTIMEZONE Tests
// ============================================================================
describe("CalendarService - VTIMEZONE Generation (Bug Fix #3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should include VTIMEZONE block in the created CalDAV event", async () => {
    const service = new TestCalendarService();
    // Simulate what `ics` library generates: UTC times with no VTIMEZONE
    const mockIcsOutput = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Cal.com//NONSGML//EN\r\nBEGIN:VEVENT\r\nUID:test-uid\r\nDTSTART:20230615T150000Z\r\nDURATION:PT1H\r\nSUMMARY:Test Event\r\nEND:VEVENT\r\nEND:VCALENDAR`;

    vi.mocked(createIcsEvent).mockReturnValue({
      error: null as unknown as Error,
      value: mockIcsOutput,
    });

    const event = createMockEvent({
      organizer: {
        name: "Test",
        email: "test@example.com",
        timeZone: "America/Chicago",
        language: { translate: ((key: string) => key) as never, locale: "en" },
      },
    });

    await service.createEvent(event, 1);

    const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
    const iCalString = calledArg.iCalString;

    expect(iCalString).toContain("BEGIN:VTIMEZONE");
    expect(iCalString).toContain("END:VTIMEZONE");
    expect(iCalString).toContain("TZID:America/Chicago");
  });

  it("should use TZID in DTSTART instead of UTC Z suffix", async () => {
    const service = new TestCalendarService();
    const mockIcsOutput = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:test-uid\r\nDTSTART:20230615T150000Z\r\nDURATION:PT1H\r\nEND:VEVENT\r\nEND:VCALENDAR`;

    vi.mocked(createIcsEvent).mockReturnValue({
      error: null as unknown as Error,
      value: mockIcsOutput,
    });

    const event = createMockEvent({
      organizer: {
        name: "Test",
        email: "test@example.com",
        timeZone: "America/Chicago",
        language: { translate: ((key: string) => key) as never, locale: "en" },
      },
    });

    await service.createEvent(event, 1);

    const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
    const iCalString = calledArg.iCalString;

    // DTSTART should now have TZID parameter, not UTC Z suffix
    expect(iCalString).toContain("DTSTART;TZID=America/Chicago:");
    // UTC form should NOT be present in DTSTART
    const unfolded = iCalString.replace(/\r?\n[ \t]/g, "");
    expect(unfolded).not.toMatch(/^DTSTART:[0-9]{8}T[0-9]{6}Z/m);
  });

  it("should convert UTC time to local time correctly for America/Chicago (UTC-5 in winter)", async () => {
    const service = new TestCalendarService();
    // 2023-01-15T15:00:00Z = 2023-01-15T09:00:00 in America/Chicago (UTC-6 in January)
    const mockIcsOutput = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:test-uid\r\nDTSTART:20230115T150000Z\r\nDURATION:PT1H\r\nEND:VEVENT\r\nEND:VCALENDAR`;

    vi.mocked(createIcsEvent).mockReturnValue({
      error: null as unknown as Error,
      value: mockIcsOutput,
    });

    const event = createMockEvent({
      startTime: "2023-01-15T15:00:00Z",
      endTime: "2023-01-15T16:00:00Z",
      organizer: {
        name: "Test",
        email: "test@example.com",
        timeZone: "America/Chicago",
        language: { translate: ((key: string) => key) as never, locale: "en" },
      },
    });

    await service.createEvent(event, 1);

    const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
    const iCalString = calledArg.iCalString;
    const unfolded = iCalString.replace(/\r?\n[ \t]/g, "");

    // America/Chicago in January is UTC-6, so 15:00 UTC = 09:00 Chicago
    expect(unfolded).toContain("DTSTART;TZID=America/Chicago:20230115T090000");
  });

  it("should place VTIMEZONE block before BEGIN:VEVENT", async () => {
    const service = new TestCalendarService();
    const mockIcsOutput = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:test-uid\r\nDTSTART:20230615T150000Z\r\nDURATION:PT1H\r\nEND:VEVENT\r\nEND:VCALENDAR`;

    vi.mocked(createIcsEvent).mockReturnValue({
      error: null as unknown as Error,
      value: mockIcsOutput,
    });

    const event = createMockEvent();
    await service.createEvent(event, 1);

    const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
    const iCalString = calledArg.iCalString;

    const vtimezoneIdx = iCalString.indexOf("BEGIN:VTIMEZONE");
    const veventIdx = iCalString.indexOf("BEGIN:VEVENT");

    expect(vtimezoneIdx).toBeGreaterThan(-1);
    expect(veventIdx).toBeGreaterThan(-1);
    expect(vtimezoneIdx).toBeLessThan(veventIdx);
  });

  it("should include VTIMEZONE with STANDARD component for non-DST timezone (UTC)", async () => {
    const service = new TestCalendarService();
    const mockIcsOutput = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:test-uid\r\nDTSTART:20230615T150000Z\r\nDURATION:PT1H\r\nEND:VEVENT\r\nEND:VCALENDAR`;

    vi.mocked(createIcsEvent).mockReturnValue({
      error: null as unknown as Error,
      value: mockIcsOutput,
    });

    const event = createMockEvent({
      organizer: {
        name: "Test",
        email: "test@example.com",
        timeZone: "UTC",
        language: { translate: ((key: string) => key) as never, locale: "en" },
      },
    });

    await service.createEvent(event, 1);

    const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
    const iCalString = calledArg.iCalString;

    expect(iCalString).toContain("BEGIN:VTIMEZONE");
    expect(iCalString).toContain("TZID:UTC");
    expect(iCalString).toContain("BEGIN:STANDARD");
  });

  it("should apply timezone fix to updateEvent as well", async () => {
    const service = new TestCalendarService();
    const mockIcsOutput = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:test-uid\r\nDTSTART:20230615T150000Z\r\nATTENDEE;CN=Guest:mailto:guest@example.com\r\nDURATION:PT1H\r\nEND:VEVENT\r\nEND:VCALENDAR`;

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

    expect(data).toContain("BEGIN:VTIMEZONE");
    expect(data).toContain("TZID:America/Chicago");
    expect(data).toContain("DTSTART;TZID=America/Chicago:");
  });
});

// ============================================================================
// Original SCHEDULE-AGENT Tests (unchanged — Bug Fix #1)
// ============================================================================
describe("CalendarService - SCHEDULE-AGENT injection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("injectScheduleAgent", () => {
    it("should inject SCHEDULE-AGENT=CLIENT into ATTENDEE lines", async () => {
      const service = new TestCalendarService();
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nMETHOD:PUBLISH\r\nBEGIN:VEVENT\r\nATTENDEE;CN=Guest:mailto:guest@example.com\r\nDTSTART:20230615T150000Z\r\nEND:VEVENT\r\nEND:VCALENDAR`;
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
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nORGANIZER;CN=Test:mailto:test@example.com\r\nATTENDEE;CN=Guest:mailto:guest@example.com\r\nDTSTART:20230615T150000Z\r\nEND:VEVENT\r\nEND:VCALENDAR`;
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
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nATTENDEE;SCHEDULE-AGENT=SERVER;CN=Guest:mailto:guest@example.com\r\nDTSTART:20230615T150000Z\r\nEND:VEVENT\r\nEND:VCALENDAR`;
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

    it("should remove METHOD:PUBLISH per RFC 4791", async () => {
      const service = new TestCalendarService();
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nMETHOD:PUBLISH\r\nBEGIN:VEVENT\r\nATTENDEE;CN=Guest:mailto:guest@example.com\r\nDTSTART:20230615T150000Z\r\nEND:VEVENT\r\nEND:VCALENDAR`;
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

    it("should preserve other iCal properties unchanged", async () => {
      const service = new TestCalendarService();
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Cal.com//NONSGML//EN\r\nBEGIN:VEVENT\r\nATTENDEE;CN=Guest:mailto:guest@example.com\r\nDTSTART:20230615T150000Z\r\nDTEND:20230615T160000Z\r\nEND:VEVENT\r\nEND:VCALENDAR`;
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

  describe("RFC 5545 Line Folding", () => {
    it("should fold long lines at 75 octets", async () => {
      const service = new TestCalendarService();
      const longName = "A".repeat(60);
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nATTENDEE;CN=${longName}:mailto:guest@example.com\r\nDTSTART:20230615T150000Z\r\nEND:VEVENT\r\nEND:VCALENDAR`;
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
  });

  describe("updateEvent", () => {
    it("should inject SCHEDULE-AGENT=CLIENT on update", async () => {
      const service = new TestCalendarService();
      const mockIcsOutput = `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nATTENDEE;CN=Guest:mailto:guest@example.com\r\nDTSTART:20230615T150000Z\r\nEND:VEVENT\r\nEND:VCALENDAR`;
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
});
