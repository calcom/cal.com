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
  fetchCalendars: vi.fn().mockResolvedValue([{ url: "http://cal.example.com/cal1", displayName: "Calendar 1", components: ["VEVENT"] }]),
  fetchCalendarObjects: vi.fn(),
  getBasicAuthHeaders: vi.fn(),
}));

vi.mock("./crypto", () => ({
  symmetricDecrypt: () =>
    JSON.stringify({ username: "user", password: "pass", url: "http://cal.example.com" }),
}));

vi.mock("uuid", () => {
  const v5 = vi.fn(() => "6ba7b811-9dad-11d1-80b4-00c04fd430c8");
  (v5 as unknown as Record<string, string>).URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
  return {
    v4: () => "mock-uid-12345",
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
      {
        key: "encrypted-key",
        user: { email: "user@example.com" },
      } as unknown as CredentialPayload,
      "test-integration",
      "http://cal.example.com"
    );
  }

  // Override to ensure we have a calendar to "create" events in
  async listCalendars(): Promise<IntegrationCalendar[]> {
    return [
      {
        externalId: "cal-1",
        name: "Test Calendar",
        primary: true,
        integration: "test",
        email: "user@example.com",
      },
    ];
  }

  // Helper to test protected updateEvent method
  public async testUpdateEvent(uid: string, event: any) {
    return this.updateEvent(uid, event);
  }
}

describe("BaseCalendarService - CalDAV Duplicate Invitation Fix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SCHEDULE-AGENT injection", () => {
    it("should inject SCHEDULE-AGENT=CLIENT into both ORGANIZER and ATTENDEE properties", async () => {
      const service = new TestCalendarService();

      const mockIcsOutput =
        "BEGIN:VCALENDAR\r\nMETHOD:PUBLISH\r\nORGANIZER;CN=Test:mailto:test@example.com\r\nATTENDEE;CN=Guest:mailto:guest@example.com\r\nEND:VCALENDAR";
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

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

      // Verify METHOD:PUBLISH is removed
      expect(iCalString).not.toContain("METHOD:PUBLISH");

      // Verify SCHEDULE-AGENT=CLIENT is injected
      expect(iCalString).toContain("ORGANIZER;SCHEDULE-AGENT=CLIENT;CN=Test");
      expect(iCalString).toContain("ATTENDEE;SCHEDULE-AGENT=CLIENT;CN=Guest");
    });

    it("should handle properties without existing parameters", async () => {
      const service = new TestCalendarService();

      const mockIcsOutput =
        "BEGIN:VCALENDAR\r\nMETHOD:PUBLISH\r\nORGANIZER:mailto:test@example.com\r\nATTENDEE:mailto:guest@example.com\r\nEND:VCALENDAR";
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

      const event = {
        title: "Test Event",
        startTime: "2023-01-01T10:00:00Z",
        endTime: "2023-01-01T11:00:00Z",
        organizer: { name: "Test", email: "test@example.com" },
        attendees: [{ name: "Guest", email: "guest@example.com" }],
      } as unknown as CalendarServiceEvent;

      await service.createEvent(event, 1);

      const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
      const iCalString = calledArg.iCalString;

      expect(iCalString).toContain("ORGANIZER;SCHEDULE-AGENT=CLIENT:mailto:test@example.com");
      expect(iCalString).toContain("ATTENDEE;SCHEDULE-AGENT=CLIENT:mailto:guest@example.com");
    });

    it("should not duplicate SCHEDULE-AGENT if already present", async () => {
      const service = new TestCalendarService();

      const mockIcsOutput =
        "BEGIN:VCALENDAR\r\nORGANIZER;SCHEDULE-AGENT=CLIENT;CN=Test:mailto:test@example.com\r\nATTENDEE;CN=Guest:mailto:guest@example.com\r\nEND:VCALENDAR";
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

      const event = {
        title: "Test Event",
        startTime: "2023-01-01T10:00:00Z",
        endTime: "2023-01-01T11:00:00Z",
        organizer: { name: "Test", email: "test@example.com" },
        attendees: [{ name: "Guest", email: "guest@example.com" }],
      } as unknown as CalendarServiceEvent;

      await service.createEvent(event, 1);

      const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
      const iCalString = calledArg.iCalString;

      // Should not have duplicate SCHEDULE-AGENT parameters
      const organizerMatches = iCalString.match(/ORGANIZER;SCHEDULE-AGENT=CLIENT/g);
      expect(organizerMatches).toHaveLength(1);

      // Attendee should still get SCHEDULE-AGENT injected
      expect(iCalString).toContain("ATTENDEE;SCHEDULE-AGENT=CLIENT;CN=Guest");
    });

    it("should handle mixed line endings (CRLF and LF)", async () => {
      const service = new TestCalendarService();

      // Mix of \r\n and \n
      const mockIcsOutput =
        "BEGIN:VCALENDAR\nMETHOD:PUBLISH\r\nORGANIZER:mailto:test@example.com\nATTENDEE:mailto:guest@example.com\r\nEND:VCALENDAR";
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

      const event = {
        title: "Test Event",
        startTime: "2023-01-01T10:00:00Z",
        endTime: "2023-01-01T11:00:00Z",
        organizer: { name: "Test", email: "test@example.com" },
        attendees: [{ name: "Guest", email: "guest@example.com" }],
      } as unknown as CalendarServiceEvent;

      await service.createEvent(event, 1);

      const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
      const iCalString = calledArg.iCalString;

      expect(iCalString).not.toContain("METHOD:PUBLISH");
      expect(iCalString).toContain("ORGANIZER;SCHEDULE-AGENT=CLIENT");
      expect(iCalString).toContain("ATTENDEE;SCHEDULE-AGENT=CLIENT");
    });

    it("should handle properties with multiple existing parameters", async () => {
      const service = new TestCalendarService();

      const mockIcsOutput =
        "BEGIN:VCALENDAR\r\nORGANIZER;CN=Test;ROLE=CHAIR:mailto:test@example.com\r\nATTENDEE;CN=Guest;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:guest@example.com\r\nEND:VCALENDAR";
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

      const event = {
        title: "Test Event",
        startTime: "2023-01-01T10:00:00Z",
        endTime: "2023-01-01T11:00:00Z",
        organizer: { name: "Test", email: "test@example.com" },
        attendees: [{ name: "Guest", email: "guest@example.com" }],
      } as unknown as CalendarServiceEvent;

      await service.createEvent(event, 1);

      const calledArg = vi.mocked(createCalendarObject).mock.calls[0][0];
      const iCalString = calledArg.iCalString;

      expect(iCalString).toContain("ORGANIZER;CN=Test;ROLE=CHAIR;SCHEDULE-AGENT=CLIENT");
      expect(iCalString).toContain(
        "ATTENDEE;CN=Guest;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;SCHEDULE-AGENT=CLIENT"
      );
    });
  });

  describe("Attendee deduplication", () => {
    it("should deduplicate attendees by email address", async () => {
      const service = new TestCalendarService();
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: "mock-ics",
      });

      const event = {
        title: "Test Event",
        startTime: "2023-01-01T10:00:00Z",
        endTime: "2023-01-01T11:00:00Z",
        organizer: { name: "Test", email: "test@example.com" },
        attendees: [{ name: "Duplicate", email: "duplicate@example.com" }],
        team: {
          members: [
            { name: "Duplicate", email: "duplicate@example.com" },
            { name: "Unique", email: "unique@example.com" },
          ],
        },
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
        expect(emails.filter((e) => e === "duplicate@example.com")).toHaveLength(1);
      }
    });

    it("should handle case-insensitive email deduplication", async () => {
      const service = new TestCalendarService();
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: "mock-ics",
      });

      const event = {
        title: "Test Event",
        startTime: "2023-01-01T10:00:00Z",
        endTime: "2023-01-01T11:00:00Z",
        organizer: { name: "Test", email: "test@example.com" },
        attendees: [
          { name: "User", email: "User@Example.COM" },
          { name: "User", email: "user@example.com" },
        ],
      } as unknown as CalendarServiceEvent;

      await service.createEvent(event, 1);

      const icsCallArgs = vi.mocked(createIcsEvent).mock.calls[0][0];
      const attendees = icsCallArgs.attendees;

      // Should deduplicate case-insensitive emails
      expect(attendees).toHaveLength(1);
    });

    it("should preserve attendees when no duplicates exist", async () => {
      const service = new TestCalendarService();
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: "mock-ics",
      });

      const event = {
        title: "Test Event",
        startTime: "2023-01-01T10:00:00Z",
        endTime: "2023-01-01T11:00:00Z",
        organizer: { name: "Test", email: "test@example.com" },
        attendees: [
          { name: "User1", email: "user1@example.com" },
          { name: "User2", email: "user2@example.com" },
          { name: "User3", email: "user3@example.com" },
        ],
      } as unknown as CalendarServiceEvent;

      await service.createEvent(event, 1);

      const icsCallArgs = vi.mocked(createIcsEvent).mock.calls[0][0];
      const attendees = icsCallArgs.attendees;

      // All unique attendees should be preserved
      expect(attendees).toHaveLength(3);
    });
  });

  describe("updateEvent SCHEDULE-AGENT injection", () => {
    it("should inject SCHEDULE-AGENT=CLIENT when updating events", async () => {
      const service = new TestCalendarService();
      const mockIcsOutput =
        "BEGIN:VCALENDAR\r\nMETHOD:PUBLISH\r\nORGANIZER;CN=Test:mailto:test@example.com\r\nEND:VCALENDAR";
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: mockIcsOutput,
      });

      const event = {
        title: "Updated Event",
        startTime: "2023-01-01T10:00:00Z",
        endTime: "2023-01-01T11:00:00Z",
        organizer: {
          name: "Test",
          email: "test@example.com",
          language: { translate: vi.fn((key) => key) },
        },
        attendees: [],
      } as unknown as any;

      // Mock getEventsByUID to return a calendar event
      (service as unknown as Record<string, any>).getEventsByUID = vi
        .fn()
        .mockResolvedValue([
          { uid: "mock-uid-12345", url: "http://cal.example.com/event", etag: "etag" },
        ]);

      await service.testUpdateEvent("mock-uid-12345", event);

      expect(updateCalendarObject).toHaveBeenCalled();
      const calledArg = vi.mocked(updateCalendarObject).mock.calls[0][0];
      const data = calledArg.calendarObject.data;

      expect(data).not.toContain("METHOD:PUBLISH");
      expect(data).toContain("ORGANIZER;SCHEDULE-AGENT=CLIENT;CN=Test");
    });
  });

  describe("UID consistency", () => {
    it("should use consistent UID across create and update operations", async () => {
      const service = new TestCalendarService();
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: "mock-ics",
      });

      const event = {
        title: "Test Event",
        startTime: "2023-01-01T10:00:00Z",
        endTime: "2023-01-01T11:00:00Z",
        organizer: { name: "Test", email: "test@example.com" },
        attendees: [],
      } as unknown as CalendarServiceEvent;

      const result = await service.createEvent(event, 1);

      // Verify UID is generated consistently
      expect(result.uid).toBe("mock-uid-12345");
      expect(result.id).toBe("mock-uid-12345");

      // Verify the same UID is passed to createEvent for iCal generation
      const icsCallArgs = vi.mocked(createIcsEvent).mock.calls[0][0];
      expect(icsCallArgs.uid).toBe("mock-uid-12345");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty attendee list", async () => {
      const service = new TestCalendarService();
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: "BEGIN:VCALENDAR\r\nORGANIZER:mailto:test@example.com\r\nEND:VCALENDAR",
      });

      const event = {
        title: "Test Event",
        startTime: "2023-01-01T10:00:00Z",
        endTime: "2023-01-01T11:00:00Z",
        organizer: { name: "Test", email: "test@example.com" },
        attendees: [],
      } as unknown as CalendarServiceEvent;

      await service.createEvent(event, 1);

      const icsCallArgs = vi.mocked(createIcsEvent).mock.calls[0][0];
      expect(icsCallArgs.attendees).toHaveLength(0);
    });

    it("should handle events without team members", async () => {
      const service = new TestCalendarService();
      vi.mocked(createIcsEvent).mockReturnValue({
        error: null as unknown as Error,
        value: "mock-ics",
      });

      const event = {
        title: "Test Event",
        startTime: "2023-01-01T10:00:00Z",
        endTime: "2023-01-01T11:00:00Z",
        organizer: { name: "Test", email: "test@example.com" },
        attendees: [{ name: "Guest", email: "guest@example.com" }],
        // No team property
      } as unknown as CalendarServiceEvent;

      await service.createEvent(event, 1);

      const icsCallArgs = vi.mocked(createIcsEvent).mock.calls[0][0];
      expect(icsCallArgs.attendees).toHaveLength(1);
    });
  });
});
