import { describe, expect, it, beforeEach, vi } from "vitest";
import BaseCalendarService from "./CalendarService";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CalendarServiceEvent } from "@calcom/types/Calendar";

// Mock the crypto module
vi.mock("./crypto", () => ({
  symmetricDecrypt: vi.fn(() => JSON.stringify({
    username: "test@example.com",
    password: "testpassword",
    url: "https://caldav.fastmail.com/"
  })),
}));

// Mock tsdav module
vi.mock("tsdav", () => ({
  createAccount: vi.fn(),
  createCalendarObject: vi.fn(() => ({ ok: true })),
  deleteCalendarObject: vi.fn(),
  fetchCalendarObjects: vi.fn(() => []),
  fetchCalendars: vi.fn(() => [
    {
      url: "https://caldav.fastmail.com/calendars/test@example.com/default/",
      displayName: "Default Calendar",
      components: ["VEVENT"],
    },
  ]),
  getBasicAuthHeaders: vi.fn(() => ({ Authorization: "Basic test" })),
  updateCalendarObject: vi.fn(() => ({ status: 200 })),
}));

// Mock ics module
vi.mock("ics", () => ({
  createEvent: vi.fn(() => ({ 
    error: null, 
    value: `BEGIN:VCALENDAR
VERSION:2.0
PRODID:cal.com
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:test-uid-123
DTSTART:20250802T100000Z
DTEND:20250802T110000Z
SUMMARY:Test Event
DESCRIPTION:Test Description
ORGANIZER;CN=Test User:MAILTO:test@example.com
ATTENDEE;CN=Attendee 1:MAILTO:attendee1@example.com
ATTENDEE;CN=Attendee 2:MAILTO:attendee2@example.com
END:VEVENT
END:VCALENDAR`
  })),
}));

// Create a test implementation of BaseCalendarService
class TestCalendarService extends BaseCalendarService {
  constructor(credential: CredentialPayload) {
    super(credential, "TestCalDAV", "https://caldav.fastmail.com/");
  }

  // Override to make the method accessible for testing
  public async listCalendars() {
    return super.listCalendars();
  }
}

describe("CalendarService CalDAV enhancements", () => {
  let service: TestCalendarService;
  let mockCredential: CredentialPayload;
  let mockEvent: CalendarServiceEvent;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockCredential = {
      id: 1,
      key: "encrypted-key",
      user: { email: "test@example.com" },
    } as CredentialPayload;

    mockEvent = {
      type: "caldav",
      title: "Test Event",
      startTime: "2025-08-02T10:00:00Z",
      endTime: "2025-08-02T11:00:00Z",
      organizer: {
        email: "test@example.com",
        name: "Test User",
        timeZone: "America/New_York",
        language: {
          translate: vi.fn((key: string) => key),
          locale: "en",
        },
      },
      attendees: [
        { email: "attendee1@example.com", name: "Attendee 1" },
        { email: "attendee2@example.com", name: "Attendee 2" },
      ],
      iCalUID: "existing-uid-456",
      calendarDescription: "Test Description",
      destinationCalendar: [
        {
          credentialId: 1,
          externalId: "https://caldav.fastmail.com/calendars/test@example.com/default/",
        },
      ],
    } as any;

    service = new TestCalendarService(mockCredential);
  });

  it("should preserve existing iCalUID when provided", async () => {
    const { createEvent } = await import("ics");
    
    await service.createEvent(mockEvent, 1);
    
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "existing-uid-456",
      })
    );
  });

  it("should add SCHEDULE-AGENT=CLIENT to attendees", async () => {
    const { createCalendarObject } = await import("tsdav");
    
    await service.createEvent(mockEvent, 1);
    
    const calls = vi.mocked(createCalendarObject).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    
    const iCalString = calls[0][0].iCalString;
    expect(iCalString).toContain("ATTENDEE;SCHEDULE-AGENT=CLIENT;");
  });

  it("should include timezone information when organizer timezone is provided", async () => {
    const { createCalendarObject } = await import("tsdav");
    
    await service.createEvent(mockEvent, 1);
    
    const calls = vi.mocked(createCalendarObject).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    
    const iCalString = calls[0][0].iCalString;
    expect(iCalString).toContain("BEGIN:VTIMEZONE");
    expect(iCalString).toContain("TZID:America/New_York");
    expect(iCalString).toContain("DTSTART;TZID=America/New_York:");
    expect(iCalString).toContain("DTEND;TZID=America/New_York:");
  });

  it("should generate new UID when iCalUID is not provided", async () => {
    const { createEvent } = await import("ics");
    
    const eventWithoutUID = { ...mockEvent };
    delete eventWithoutUID.iCalUID;
    
    await service.createEvent(eventWithoutUID, 1);
    
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
      })
    );
  });

  it("should apply CalDAV enhancements in updateEvent as well", async () => {
    const { updateCalendarObject } = await import("tsdav");
    
    // Mock getEventsByUID to simulate existing events
    vi.spyOn(service as any, 'getEventsByUID').mockResolvedValue([
      {
        uid: "test-uid",
        url: "https://caldav.fastmail.com/calendars/test@example.com/default/test-uid.ics",
        etag: "test-etag-123"
      }
    ]);
    
    const uid = "test-uid";
    await service.updateEvent(uid, mockEvent);
    
    const calls = vi.mocked(updateCalendarObject).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    
    const sentData = calls[0][0].calendarObject.data;
    expect(sentData).toContain("ATTENDEE;SCHEDULE-AGENT=CLIENT;");
    expect(sentData).toContain("BEGIN:VTIMEZONE");
    expect(sentData).toContain("TZID:America/New_York");
  });

  it("should handle multiple timezone formats correctly", async () => {
    const { createCalendarObject } = await import("tsdav");
    
    const timezones = ["Europe/London", "Asia/Tokyo", "Australia/Sydney"];

    for (const timezone of timezones) {
      vi.clearAllMocks();
      
      const eventWithTimezone = {
        ...mockEvent,
        organizer: { ...mockEvent.organizer, timeZone: timezone }
      };

      await service.createEvent(eventWithTimezone, 1);
      
      const calls = vi.mocked(createCalendarObject).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      const iCalString = calls[0][0].iCalString;
      expect(iCalString).toContain(`TZID:${timezone}`);
      expect(iCalString).toContain(`DTSTART;TZID=${timezone}:`);
      expect(iCalString).toContain(`DTEND;TZID=${timezone}:`);
    }
  });
});
