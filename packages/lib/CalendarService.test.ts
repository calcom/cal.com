import { describe, expect, it, vi, beforeEach } from "vitest";
import BaseCalendarService from "./CalendarService";
import { createEvent as createIcsEvent } from "ics";
import { createCalendarObject, updateCalendarObject } from "tsdav";
import type { CalendarServiceEvent, IntegrationCalendar } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

// Mock dependencies
vi.mock("ics", async () => ({
  createEvent: vi.fn(),
}));

vi.mock("tsdav", async () => ({
  createAccount: vi.fn(),
  createCalendarObject: vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("ok") }),
  updateCalendarObject: vi.fn().mockResolvedValue({ status: 200 }),
  fetchCalendars: vi.fn().mockResolvedValue([
    { url: "http://cal.com/cal1", displayName: "Calendar 1" }
  ]),
  fetchCalendarObjects: vi.fn(),
  getBasicAuthHeaders: vi.fn(),
}));

vi.mock("./crypto", () => ({
  symmetricDecrypt: () => JSON.stringify({ username: "user", password: "pass", url: "http://cal.com" }),
}));

vi.mock("uuid", () => {
  const v5 = vi.fn(() => "6ba7b811-9dad-11d1-80b4-00c04fd430c8");
  (v5 as unknown as Record<string, string>).URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
  return {
    v4: () => "mock-uid",
    v5,
  };
});

// Mock logger to avoid clutter
vi.mock("./logger", () => ({
  default: {
    getSubLogger: () => ({
      error: vi.fn(),
      debug: vi.fn(),
    }),
    error: vi.fn(),
  },
}));

// Concrete implementation for testing
class TestCalendarService extends BaseCalendarService {
  constructor() {
    super(
      { key: "encrypted-key", user: { email: "user@example.com" } } as unknown as CredentialPayload,
      "test-integration",
      "http://cal.com"
    );
  }

  // Override to ensure we have a calendar to "create" events in
  async listCalendars(): Promise<IntegrationCalendar[]> {
    return [{ externalId: "cal-1", name: "Test Calendar", primary: true, integration: "test", email: "user@example.com" }];
  }

  // Helper to mock protected methods
  public async testUpdateEvent(uid: string, event: any) {
    return this.updateEvent(uid, event);
  }
}

describe("BaseCalendarService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should inject SCHEDULE-AGENT=CLIENT and remove METHOD:PUBLISH", async () => {
    const service = new TestCalendarService();
    
    // Mock ics output
    const mockIcsOutput = "BEGIN:VCALENDAR\r\nMETHOD:PUBLISH\r\nORGANIZER;CN=Test:mailto:test@example.com\r\nATTENDEE;CN=Guest:mailto:guest@example.com\r\nEND:VCALENDAR";
    vi.mocked(createIcsEvent).mockReturnValue({ error: null as unknown as Error, value: mockIcsOutput });

    const event = {
      title: "Test Event",
      startTime: "2023-01-01T10:00:00Z",
      endTime: "2023-01-01T11:00:00Z",
      organizer: { name: "Test", email: "test@example.com" },
      attendees: [{ name: "Guest", email: "guest@example.com" }],
    } as unknown as CalendarServiceEvent;

    await service.createEvent(event, 1);

    expect(createCalendarObject).toHaveBeenCalled();
    const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
    const iCalString = calledArg.iCalString;

    expect(iCalString).not.toContain("METHOD:PUBLISH");
    // Regex logic check
    expect(iCalString).toContain("ORGANIZER;SCHEDULE-AGENT=CLIENT;CN=Test");
    expect(iCalString).toContain("ATTENDEE;SCHEDULE-AGENT=CLIENT;CN=Guest");
  });

  it("should handle properties without parameters correctly", async () => {
    const service = new TestCalendarService();
    
    // Mock ics output without parameters
    const mockIcsOutput = "BEGIN:VCALENDAR\r\nMETHOD:PUBLISH\r\nORGANIZER:mailto:test@example.com\r\nEND:VCALENDAR";
    vi.mocked(createIcsEvent).mockReturnValue({ error: null as unknown as Error, value: mockIcsOutput });

    const event = {
      title: "Test Event",
      startTime: "2023-01-01T10:00:00Z",
      endTime: "2023-01-01T11:00:00Z",
      organizer: { name: "Test", email: "test@example.com" },
      attendees: [],
    } as unknown as CalendarServiceEvent;

    await service.createEvent(event, 1);

    expect(createCalendarObject).toHaveBeenCalled();
    const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
    const iCalString = calledArg.iCalString;

    expect(iCalString).toContain("ORGANIZER;SCHEDULE-AGENT=CLIENT:mailto:test@example.com");
  });

  it("should deduplicate attendees by email", async () => {
    const service = new TestCalendarService();
    vi.mocked(createIcsEvent).mockReturnValue({ error: null as unknown as Error, value: "mock-ics" });

    const event = {
      title: "Test Event",
      startTime: "2023-01-01T10:00:00Z",
      endTime: "2023-01-01T11:00:00Z",
      organizer: { name: "Test", email: "test@example.com" },
      attendees: [{ name: "Duplicate", email: "duplicate@example.com" }],
      team: {
        members: [{ name: "Duplicate", email: "duplicate@example.com" }, { name: "Unique", email: "unique@example.com" }]
      }
    } as unknown as CalendarServiceEvent;

    await service.createEvent(event, 1);

    const icsCallArgs = vi.mocked(createIcsEvent).mock.calls[0][0];
    const attendees = icsCallArgs.attendees;

    // Should have 2 unique attendees (duplicate@example.com and unique@example.com)
    expect(attendees).toHaveLength(2);
    if (attendees) {
      const emails = attendees.map((a) => a.email);
      expect(emails).toContain("duplicate@example.com");
      expect(emails).toContain("unique@example.com");
      // Verify count of duplicate@example.com is exactly 1
      expect(emails.filter(e => e === "duplicate@example.com")).toHaveLength(1);
    }
  });

  it("should update event with SCHEDULE-AGENT=CLIENT", async () => {
    const service = new TestCalendarService();
    const mockIcsOutput = "BEGIN:VCALENDAR\r\nMETHOD:PUBLISH\r\nORGANIZER;CN=Test:mailto:test@example.com\r\nEND:VCALENDAR";
    vi.mocked(createIcsEvent).mockReturnValue({ error: null as unknown as Error, value: mockIcsOutput });

    const event = {
      title: "Updated Event",
      startTime: "2023-01-01T10:00:00Z",
      endTime: "2023-01-01T11:00:00Z",
      organizer: {
        name: "Test", 
        email: "test@example.com",
        language: { translate: vi.fn((key) => key) }
      },
      attendees: [],
    } as unknown as any;

    // Mock getEventsByUID to return a calendar event
    (service as unknown as Record<string, any>).getEventsByUID = vi.fn().mockResolvedValue([{ uid: "mock-uid", url: "http://cal.com/event", etag: "etag" }]);

    await service.testUpdateEvent("mock-uid", event);

    expect(updateCalendarObject).toHaveBeenCalled();
    const calledArg = vi.mocked(updateCalendarObject).mock.calls[0][0];
    const data = calledArg.calendarObject.data;

    expect(data).not.toContain("METHOD:PUBLISH");
    expect(data).toContain("ORGANIZER;SCHEDULE-AGENT=CLIENT;CN=Test");
  });
});