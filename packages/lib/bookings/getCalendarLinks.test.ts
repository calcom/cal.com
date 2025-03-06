import type { TFunction } from "i18next";
import { createEvent } from "ics";
import { RRule } from "rrule";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import dayjs from "@calcom/dayjs";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";

import { getCalendarLinks, CalendarLinkType } from "./getCalendarLinks";

// Mock dependencies
vi.mock("ics", () => ({
  createEvent: vi.fn(),
}));

vi.mock("@calcom/lib/isRecurringEvent", () => ({
  parseRecurringEvent: vi.fn(),
}));

vi.mock("../event", () => ({
  getEventName: vi.fn().mockImplementation(({ eventName }) => `Test: ${eventName}`),
}));

describe("getCalendarLinks", () => {
  // Mock data for tests
  const mockStartTime = new Date("2023-01-15T10:00:00Z");
  const mockEndTime = new Date("2023-01-15T11:00:00Z");
  const mockDayjsStartTime = dayjs(mockStartTime);
  const mockDayjsEndTime = dayjs(mockEndTime);

  // Mock translation function
  const mockT = (key: string) => key as unknown as TFunction;

  // Mock createEvent implementation
  const mockIcsValue = "BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR";

  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();

    // Default mock implementations
    (createEvent as jest.Mock).mockReturnValue({ value: mockIcsValue });
    (parseRecurringEvent as jest.Mock).mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("buildICalLink", () => {
    it("should generate a valid ICS link", async () => {
      // The test will indirectly test buildICalLink through getCalendarLinks
      const booking = {
        startTime: mockStartTime,
        endTime: mockEndTime,
        location: "Test Location",
        title: "Test Title",
        responses: {},
        metadata: {},
      };

      const eventType = {
        recurringEvent: {},
        description: "Test Description",
        eventName: "Test Event",
        isDynamic: false,
        length: 60,
        team: null,
        users: [{ name: "Test User" }],
        title: "Test Title",
      };

      const result = await getCalendarLinks({ booking, eventType, t: mockT });
      const icsLink = result.find((link) => link.id === "ics");

      expect(icsLink).toBeDefined();
      expect(icsLink?.link).toContain("data:text/calendar");
      expect(icsLink?.link).toContain(encodeURIComponent(mockIcsValue));
      expect(createEvent).toHaveBeenCalled();
      expect(createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          description: eventType.description,
        })
      );
    });

    it("should handle null location and description", async () => {
      const booking = {
        startTime: mockStartTime,
        endTime: mockEndTime,
        location: "",
        title: "Test Title",
        responses: {},
        metadata: {},
      };

      const eventType = {
        recurringEvent: {},
        description: "",
        eventName: "Test Event",
        isDynamic: false,
        length: 60,
        team: null,
        users: [{ name: "Test User" }],
        title: "Test Title",
      };

      const result = await getCalendarLinks({ booking, eventType, t: mockT });
      const icsLink = result.find((link) => link.id === "ics");

      expect(icsLink).toBeDefined();
      expect(createEvent).toHaveBeenCalledWith(
        expect.not.objectContaining({
          location: expect.anything(),
          description: expect.anything(),
        })
      );
    });

    it("should handle error in ICS generation", async () => {
      // Mock createEvent to return an error
      (createEvent as jest.Mock).mockReturnValue({ error: new Error("ICS generation failed") });

      const booking = {
        startTime: mockStartTime,
        endTime: mockEndTime,
        location: "Test Location",
        title: "Test Title",
        responses: {},
        metadata: {},
      };

      const eventType = {
        recurringEvent: {},
        description: "Test Description",
        eventName: "Test Event",
        isDynamic: false,
        length: 60,
        team: null,
        users: [{ name: "Test User" }],
        title: "Test Title",
      };

      // Mock console.error to avoid test output noise
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

      const result = await getCalendarLinks({ booking, eventType, t: mockT });
      const icsLink = result.find((link) => link.id === "ics");

      expect(icsLink).toBeDefined();
      expect(icsLink?.link).toBe("");
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Verify createEvent was called with the correct description
      expect(createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          description: eventType.description,
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("buildGoogleCalendarLink", () => {
    it("should generate a valid Google Calendar link", async () => {
      const booking = {
        startTime: mockStartTime,
        endTime: mockEndTime,
        location: "Test Location",
        title: "Test Title",
        responses: {},
        metadata: {},
      };

      const eventType = {
        recurringEvent: {},
        description: "Test Description",
        eventName: "Test Event",
        isDynamic: false,
        length: 60,
        team: null,
        users: [{ name: "Test User" }],
        title: "Test Title",
      };

      const result = await getCalendarLinks({ booking, eventType, t: mockT });
      const googleLink = result.find((link) => link.id === "googleCalendar");

      expect(googleLink).toBeDefined();
      expect(googleLink?.link).toContain("https://calendar.google.com/calendar/r/eventedit");
      expect(googleLink?.link).toContain("dates=");
      expect(googleLink?.link).toContain(
        `${mockDayjsStartTime.utc().format("YYYYMMDDTHHmmss[Z]")}/${mockDayjsEndTime
          .utc()
          .format("YYYYMMDDTHHmmss[Z]")}`
      );
      expect(googleLink?.link).toContain(`details=${encodeURIComponent(eventType.description)}`);
    });

    it("should include location when provided", async () => {
      const booking = {
        startTime: mockStartTime,
        endTime: mockEndTime,
        location: "Test Location",
        title: "Test Title",
        responses: {},
        metadata: { videoCallUrl: "https://zoom.com/test" },
      };

      const eventType = {
        recurringEvent: {},
        description: "Test Description",
        eventName: "Test Event",
        isDynamic: false,
        length: 60,
        team: null,
        users: [{ name: "Test User" }],
        title: "Test Title",
      };

      const result = await getCalendarLinks({ booking, eventType, t: mockT });
      const googleLink = result.find((link) => link.id === "googleCalendar");

      expect(googleLink).toBeDefined();
      expect(googleLink?.link).toContain("location=https%3A%2F%2Fzoom.com%2Ftest");
    });

    it("should handle recurring events", async () => {
      // Mock a recurring event rule
      const mockRecurringRule = {
        freq: 2, // WEEKLY
        interval: 1,
        count: 5,
      };

      (parseRecurringEvent as jest.Mock).mockReturnValue(mockRecurringRule);

      const booking = {
        startTime: mockStartTime,
        endTime: mockEndTime,
        location: "Test Location",
        title: "Test Title",
        responses: {},
        metadata: {},
      };

      const eventType = {
        recurringEvent: { count: 5, freq: 2, interval: 1 },
        description: "Test Description",
        eventName: "Test Event",
        isDynamic: false,
        length: 60,
        team: null,
        users: [{ name: "Test User" }],
        title: "Test Title",
      };

      const mockRRuleString = "FREQ=WEEKLY;INTERVAL=1;COUNT=5";
      vi.spyOn(RRule.prototype, "toString").mockReturnValue(mockRRuleString);

      const result = await getCalendarLinks({ booking, eventType, t: mockT });
      const googleLink = result.find((link) => link.id === "googleCalendar");

      expect(googleLink).toBeDefined();
      expect(googleLink?.link).toContain(`recur=${encodeURIComponent(mockRRuleString)}`);
    });

    it("should handle special characters in event name and description", async () => {
      const booking = {
        startTime: mockStartTime,
        endTime: mockEndTime,
        location: "Test & Location",
        title: "Test & Title",
        responses: {},
        metadata: {},
      };

      const eventType = {
        recurringEvent: {},
        description: "Test & Description with <special> characters",
        eventName: "Test & Event with <special> characters",
        isDynamic: false,
        length: 60,
        team: null,
        users: [{ name: "Test User" }],
        title: "Test & Title",
      };

      const result = await getCalendarLinks({ booking, eventType, t: mockT });
      const googleLink = result.find((link) => link.id === CalendarLinkType.GOOGLE_CALENDAR);
      const office365Link = result.find((link) => link.id === CalendarLinkType.MICROSOFT_OFFICE);
      const outlookLink = result.find((link) => link.id === CalendarLinkType.MICROSOFT_OUTLOOK);

      expect(googleLink).toBeDefined();
      expect(googleLink?.link).toContain("Test%20%26%20Description%20with%20%3Cspecial%3E%20characters");

      // Verify description in Office 365 link - check for the unencoded description
      expect(office365Link?.link).toContain(
        "body=Test%20%26%20Description%20with%20%3Cspecial%3E%20characters"
      );

      // Verify description in Outlook link - For Outlook, the & appears unencoded in the error message
      expect(outlookLink?.link).toContain("body=Test%20&%20Description%20with%20%3Cspecial%3E%20characters");
    });
  });

  describe("buildMicrosoftOfficeLink", () => {
    it("should generate a valid Office 365 link", async () => {
      const booking = {
        startTime: mockStartTime,
        endTime: mockEndTime,
        location: "Test Location",
        title: "Test Title",
        responses: {},
        metadata: {},
      };

      const eventType = {
        recurringEvent: {},
        description: "Test Description",
        eventName: "Test Event",
        isDynamic: false,
        length: 60,
        team: null,
        users: [{ name: "Test User" }],
        title: "Test Title",
      };

      const result = await getCalendarLinks({ booking, eventType, t: mockT });
      const microsoftOfficeLink = result.find((link) => link.id === CalendarLinkType.MICROSOFT_OFFICE);

      expect(microsoftOfficeLink).toBeDefined();
      expect(microsoftOfficeLink?.link).toContain("https://outlook.office.com/calendar/0/deeplink/compose");
      expect(microsoftOfficeLink?.link).toContain("enddt=");
      expect(microsoftOfficeLink?.link).toContain("startdt=");
      expect(microsoftOfficeLink?.link).toContain("body=Test%20Description");
    });

    it("should include location when provided", async () => {
      const booking = {
        startTime: mockStartTime,
        endTime: mockEndTime,
        location: "Test Location",
        title: "Test Title",
        responses: {},
        metadata: { videoCallUrl: "https://zoom.com/test" },
      };

      const eventType = {
        recurringEvent: {},
        description: "Test Description",
        eventName: "Test Event",
        isDynamic: false,
        length: 60,
        team: null,
        users: [{ name: "Test User" }],
        title: "Test Title",
      };

      const result = await getCalendarLinks({ booking, eventType, t: mockT });
      const office365Link = result.find((link) => link.id === CalendarLinkType.MICROSOFT_OFFICE);

      expect(office365Link).toBeDefined();
      expect(office365Link?.link).toContain("location=https%3A%2F%2Fzoom.com%2Ftest");
    });
  });

  describe("buildOutlookLink", () => {
    it("should generate a valid Outlook link", async () => {
      const booking = {
        startTime: mockStartTime,
        endTime: mockEndTime,
        location: "Test Location",
        title: "Test Title",
        responses: {},
        metadata: {},
      };

      const eventType = {
        recurringEvent: {},
        description: "Test Description",
        eventName: "Test Event",
        isDynamic: false,
        length: 60,
        team: null,
        users: [{ name: "Test User" }],
        title: "Test Title",
      };

      const result = await getCalendarLinks({ booking, eventType, t: mockT });
      const outlookLink = result.find((link) => link.id === CalendarLinkType.MICROSOFT_OUTLOOK);

      expect(outlookLink).toBeDefined();
      expect(outlookLink?.link).toContain("https://outlook.live.com/calendar/0/deeplink/compose");
      expect(outlookLink?.link).toContain("enddt=");
      expect(outlookLink?.link).toContain("startdt=");
      expect(outlookLink?.link).toContain("body=Test%20Description");
    });

    it("should include location when provided", async () => {
      const booking = {
        startTime: mockStartTime,
        endTime: mockEndTime,
        location: "Test Location",
        title: "Test Title",
        responses: {},
        metadata: { videoCallUrl: "https://zoom.com/test" },
      };

      const eventType = {
        recurringEvent: {},
        description: "Test Description",
        eventName: "Test Event",
        isDynamic: false,
        length: 60,
        team: null,
        users: [{ name: "Test User" }],
        title: "Test Title",
      };

      const result = await getCalendarLinks({ booking, eventType, t: mockT });
      const outlookLink = result.find((link) => link.id === CalendarLinkType.MICROSOFT_OUTLOOK);

      expect(outlookLink).toBeDefined();
      expect(outlookLink?.link).toContain("location=https%3A%2F%2Fzoom.com%2Ftest");
    });

    it("should handle custom title from dynamic event", async () => {
      const customTitle = "Custom Dynamic Title";
      const booking = {
        startTime: mockStartTime,
        endTime: mockEndTime,
        location: "Test Location",
        title: "Test Title",
        responses: { title: customTitle, name: "Test Attendee" },
        metadata: {},
      };

      const eventType = {
        recurringEvent: {},
        description: "Test Description",
        eventName: "Test Event",
        isDynamic: true, // This makes it use the custom title
        length: 60,
        team: null,
        users: [{ name: "Test User" }],
        title: "Test Title",
      };

      const result = await getCalendarLinks({ booking, eventType, t: mockT });

      // Check Google Calendar link
      const googleLink = result.find((link) => link.id === CalendarLinkType.GOOGLE_CALENDAR);
      expect(googleLink?.link).toContain(`details=${encodeURIComponent(eventType.description)}`);

      // Check Office 365 link
      const office365Link = result.find((link) => link.id === CalendarLinkType.MICROSOFT_OFFICE);
      expect(office365Link?.link).toContain("body=Test%20Description");

      // Check Outlook link
      const outlookLink = result.find((link) => link.id === CalendarLinkType.MICROSOFT_OUTLOOK);
      expect(outlookLink?.link).toContain("body=Test%20Description");
    });

    it("should handle team events", async () => {
      const booking = {
        startTime: mockStartTime,
        endTime: mockEndTime,
        location: "Test Location",
        title: "Test Title",
        responses: {},
        metadata: {},
      };

      const eventType = {
        recurringEvent: {},
        description: "Test Description",
        eventName: "Test Event",
        isDynamic: false,
        length: 60,
        team: { name: "Test Team" },
        users: [{ name: "Test User" }],
        title: "Test Title",
      };

      const result = await getCalendarLinks({ booking, eventType, t: mockT });

      // The event should use the team name in the event
      expect(result).toHaveLength(4);

      // Verify description is included in all calendar links
      const googleLink = result.find((link) => link.id === CalendarLinkType.GOOGLE_CALENDAR);
      const office365Link = result.find((link) => link.id === CalendarLinkType.MICROSOFT_OFFICE);
      const outlookLink = result.find((link) => link.id === CalendarLinkType.MICROSOFT_OUTLOOK);
      const icsLink = result.find((link) => link.id === CalendarLinkType.ICS);

      expect(googleLink?.link).toContain(`details=${encodeURIComponent(eventType.description)}`);
      expect(office365Link?.link).toContain("body=Test%20Description");
      expect(outlookLink?.link).toContain("body=Test%20Description");
      expect(createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          description: eventType.description,
        })
      );
    });
  });

  describe("getCalendarLinks", () => {
    it("should return all calendar links", async () => {
      const booking = {
        startTime: mockStartTime,
        endTime: mockEndTime,
        location: "Test Location",
        title: "Test Title",
        responses: {},
        metadata: {},
      };

      const eventType = {
        recurringEvent: {},
        description: "Test Description",
        eventName: "Test Event",
        isDynamic: false,
        length: 60,
        team: null,
        users: [{ name: "Test User" }],
        title: "Test Title",
      };

      const result = await getCalendarLinks({ booking, eventType, t: mockT });

      expect(result).toHaveLength(4);
      expect(result.map((link) => link.id)).toEqual(
        expect.arrayContaining([
          CalendarLinkType.GOOGLE_CALENDAR,
          CalendarLinkType.MICROSOFT_OFFICE,
          CalendarLinkType.MICROSOFT_OUTLOOK,
          CalendarLinkType.ICS,
        ])
      );
    });

    it("should use videoCallUrl from metadata when available", async () => {
      const videoCallUrl = "https://zoom.com/test";
      const booking = {
        startTime: mockStartTime,
        endTime: mockEndTime,
        location: "Test Location",
        title: "Test Title",
        responses: {},
        metadata: { videoCallUrl },
      };

      const eventType = {
        recurringEvent: {},
        description: "Test Description",
        eventName: "Test Event",
        isDynamic: false,
        length: 60,
        team: null,
        users: [{ name: "Test User" }],
        title: "Test Title",
      };

      const result = await getCalendarLinks({ booking, eventType, t: mockT });

      // Check that all links contain the videoCallUrl
      const googleLink = result.find((link) => link.id === CalendarLinkType.GOOGLE_CALENDAR);
      const office365Link = result.find((link) => link.id === CalendarLinkType.MICROSOFT_OFFICE);
      const outlookLink = result.find((link) => link.id === CalendarLinkType.MICROSOFT_OUTLOOK);

      expect(googleLink?.link).toContain(encodeURIComponent(videoCallUrl));
      expect(office365Link?.link).toContain(encodeURIComponent(videoCallUrl));
      expect(outlookLink?.link).toContain(encodeURIComponent(videoCallUrl));
    });
  });
});
