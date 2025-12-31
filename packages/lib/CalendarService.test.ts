import { describe, expect, it, vi, beforeEach } from "vitest";
import BaseCalendarService from "./CalendarService";
import { createEvent as createIcsEvent } from "ics";
import { createCalendarObject } from "tsdav";

// Mock dependencies
vi.mock("ics", async () => ({
  createEvent: vi.fn(),
}));

vi.mock("tsdav", async () => ({
  createAccount: vi.fn(),
  createCalendarObject: vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("ok") }),
  fetchCalendars: vi.fn().mockResolvedValue([
    { url: "http://cal.com/cal1", displayName: "Calendar 1" }
  ]),
  fetchCalendarObjects: vi.fn(),
  getBasicAuthHeaders: vi.fn(),
}));

vi.mock("./crypto", () => ({
  symmetricDecrypt: () => JSON.stringify({ username: "user", password: "pass", url: "http://cal.com" }),
}));

vi.mock("uuid", () => ({
  v4: () => "mock-uid",
}));

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
      { key: "encrypted-key", user: { email: "user@example.com" } } as any,
      "test-integration",
      "http://cal.com"
    );
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
    (createIcsEvent as any).mockReturnValue({ error: null, value: mockIcsOutput });

    const event = {
      title: "Test Event",
      startTime: "2023-01-01T10:00:00Z",
      endTime: "2023-01-01T11:00:00Z",
      organizer: { name: "Test", email: "test@example.com" },
      attendees: [{ name: "Guest", email: "guest@example.com" }],
    } as any;

    await service.createEvent(event, 1);

    expect(createCalendarObject).toHaveBeenCalled();
    const calledArg = (createCalendarObject as any).mock.calls[0][0];
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
    (createIcsEvent as any).mockReturnValue({ error: null, value: mockIcsOutput });

    const event = {
      title: "Test Event",
      startTime: "2023-01-01T10:00:00Z",
      endTime: "2023-01-01T11:00:00Z",
      organizer: { name: "Test", email: "test@example.com" },
      attendees: [],
    } as any;

    await service.createEvent(event, 1);

    expect(createCalendarObject).toHaveBeenCalled();
    const calledArg = (createCalendarObject as any).mock.calls[0][0];
    const iCalString = calledArg.iCalString;

    expect(iCalString).toContain("ORGANIZER;SCHEDULE-AGENT=CLIENT:mailto:test@example.com");
  });

  it("should deduplicate attendees by email", async () => {
    const service = new TestCalendarService();
    (createIcsEvent as any).mockReturnValue({ error: null, value: "mock-ics" });

    const event = {
      title: "Test Event",
      startTime: "2023-01-01T10:00:00Z",
      endTime: "2023-01-01T11:00:00Z",
      organizer: { name: "Test", email: "test@example.com" },
      attendees: [{ name: "Duplicate", email: "duplicate@example.com" }],
      team: {
        members: [{ name: "Duplicate", email: "duplicate@example.com" }, { name: "Unique", email: "unique@example.com" }]
      }
    } as any;

    await service.createEvent(event, 1);

    const icsCallArgs = (createIcsEvent as any).mock.calls[0][0];
    const attendees = icsCallArgs.attendees;

    // Should have 2 unique attendees (duplicate@example.com and unique@example.com)
    expect(attendees).toHaveLength(2);
    const emails = attendees.map((a: any) => a.email);
    expect(emails).toContain("duplicate@example.com");
    expect(emails).toContain("unique@example.com");
    // Verify count of duplicate@example.com is exactly 1
    expect(emails.filter(e => e === "duplicate@example.com")).toHaveLength(1);
  });
});
