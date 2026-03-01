import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetCalendar, mockGetApps, mockFormatCalEvent, mockGetUid, mockGetRichDescription } = vi.hoisted(
  () => ({
    mockGetCalendar: vi.fn(),
    mockGetApps: vi.fn().mockReturnValue([]),
    mockFormatCalEvent: vi.fn((event: Record<string, unknown>) => event),
    mockGetUid: vi.fn().mockReturnValue("mock-uid-123"),
    mockGetRichDescription: vi.fn().mockReturnValue("Test description"),
  })
);

vi.mock("@calcom/app-store/_utils/getCalendar", () => ({
  getCalendar: mockGetCalendar,
}));

vi.mock("@calcom/app-store/utils", () => ({
  default: mockGetApps,
}));

vi.mock("@calcom/lib/formatCalendarEvent", () => ({
  formatCalEvent: mockFormatCalEvent,
}));

vi.mock("@calcom/lib/CalEventParser", () => ({
  getRichDescription: mockGetRichDescription,
  getUid: mockGetUid,
}));

vi.mock("@calcom/app-store/locations", () => ({
  MeetLocationType: "integrations:google:meet",
}));

vi.mock("@calcom/lib/constants", () => ({
  ORGANIZER_EMAIL_EXEMPT_DOMAINS: "",
  IS_PRODUCTION: false,
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
    error: vi.fn(),
  },
}));

vi.mock("@calcom/lib/piiFreeData", () => ({
  getPiiFreeCalendarEvent: vi.fn((e: unknown) => e),
  getPiiFreeCredential: vi.fn((c: unknown) => c),
}));

vi.mock("@calcom/lib/safeStringify", () => ({
  safeStringify: vi.fn((v: unknown) => JSON.stringify(v)),
}));

vi.mock("@calcom/lib/delegationCredential", () => ({
  buildNonDelegationCredentials: vi.fn((creds: unknown[]) => creds),
}));

vi.mock("@calcom/features/calendars/lib/getCalendarsEvents", () => ({
  default: vi.fn().mockResolvedValue([]),
  getCalendarsEventsWithTimezones: vi.fn().mockResolvedValue([]),
}));

import type { CredentialForCalendarService } from "@calcom/types/Credential";
import {
  cleanIntegrationKeys,
  createEvent,
  deleteEvent,
  getConnectedCalendars,
  updateEvent,
} from "./CalendarManager";

function buildCredentialForService(overrides: Partial<CredentialForCalendarService> = {}) {
  return {
    id: 1,
    type: "google_calendar",
    key: { access_token: "test_token" },
    encryptedKey: null,
    userId: 1,
    user: { email: "test@example.com" },
    teamId: null,
    appId: "google-calendar",
    appName: "Google Calendar",
    invalid: false,
    delegatedToId: null,
    delegatedTo: null,
    ...overrides,
  } as CredentialForCalendarService;
}

function buildCalEvent() {
  return {
    type: "test-event",
    title: "Test Event",
    startTime: "2024-01-01T10:00:00Z",
    endTime: "2024-01-01T11:00:00Z",
    uid: "test-uid",
    organizer: {
      name: "Organizer",
      email: "organizer@example.com",
      timeZone: "UTC",
      language: { translate: (x: string) => x, locale: "en" },
    },
    attendees: [],
    destinationCalendar: null,
    hideOrganizerEmail: false,
    hideCalendarNotes: false,
    location: null,
  };
}

describe("CalendarManager expansion tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fn: cleanIntegrationKeys", () => {
    it("should remove credentials and credential keys from integration", () => {
      const integration = {
        slug: "google-calendar",
        type: "google_calendar",
        credentials: [{ id: 1, key: "secret" }],
        credential: { id: 1, key: "secret" },
        name: "Google Calendar",
      };

      const result = cleanIntegrationKeys(integration as never);

      expect(result).not.toHaveProperty("credentials");
      expect(result).not.toHaveProperty("credential");
      expect(result).toHaveProperty("slug", "google-calendar");
      expect(result).toHaveProperty("name", "Google Calendar");
    });

    it("should preserve all other properties", () => {
      const integration = {
        slug: "outlook",
        type: "office365_calendar",
        credentials: [],
        credential: undefined,
        variant: "calendar",
        categories: ["calendar"],
      };

      const result = cleanIntegrationKeys(integration as never);

      expect(result).toHaveProperty("slug", "outlook");
      expect(result).toHaveProperty("variant", "calendar");
      expect(result).toHaveProperty("categories");
    });
  });

  describe("fn: getConnectedCalendars", () => {
    it("should return empty connectedCalendars for empty calendarCredentials", async () => {
      const result = await getConnectedCalendars([], []);

      expect(result.connectedCalendars).toEqual([]);
      expect(result.destinationCalendar).toBeUndefined();
    });

    it("should handle calendar that returns null from getCalendar", async () => {
      const calendarCredentials = [
        {
          integration: {
            slug: "google",
            type: "google_calendar",
            credentials: [],
            credential: undefined,
          } as never,
          credential: { id: 1, delegatedToId: null } as never,
          calendar: Promise.resolve(null),
        },
      ];

      const result = await getConnectedCalendars(calendarCredentials as never, []);

      expect(result.connectedCalendars).toHaveLength(1);
      expect(result.connectedCalendars[0].credentialId).toBe(1);
      expect(result.connectedCalendars[0]).not.toHaveProperty("calendars");
    });

    it("should handle error from calendar instance with invalid_grant", async () => {
      const calendarCredentials = [
        {
          integration: {
            slug: "google",
            type: "google_calendar",
            credentials: [],
            credential: undefined,
          } as never,
          credential: { id: 1, delegatedToId: null } as never,
          calendar: Promise.resolve(() => {
            throw new Error("invalid_grant");
          }),
        },
      ];

      const result = await getConnectedCalendars(calendarCredentials as never, []);

      expect(result.connectedCalendars).toHaveLength(1);
      expect(result.connectedCalendars[0].error?.message).toBe("Access token expired or revoked");
    });

    it("should find destinationCalendar when destinationCalendarExternalId is provided", async () => {
      const mockCalendar = vi.fn().mockResolvedValue({
        listCalendars: vi.fn().mockResolvedValue([
          {
            externalId: "dest-cal-123",
            integration: "google_calendar",
            primary: true,
            email: "user@example.com",
            name: "My Calendar",
          },
        ]),
      });

      const calendarCredentials = [
        {
          integration: {
            slug: "google",
            type: "google_calendar",
            title: "Google Calendar",
            credentials: [],
            credential: undefined,
          } as never,
          credential: { id: 1, delegatedToId: null } as never,
          calendar: Promise.resolve(mockCalendar),
        },
      ];

      const result = await getConnectedCalendars(calendarCredentials as never, [], "dest-cal-123");

      expect(result.destinationCalendar).toBeDefined();
      expect(result.destinationCalendar?.externalId).toBe("dest-cal-123");
    });
  });

  describe("fn: createEvent", () => {
    it("should return success result when calendar creates event", async () => {
      const mockCreatedEvent = {
        id: "event-1",
        iCalUID: "ical-123@Cal.com",
        additionalInfo: { calWarnings: [] },
      };
      mockGetCalendar.mockResolvedValue({
        createEvent: vi.fn().mockResolvedValue(mockCreatedEvent),
      });

      const credential = buildCredentialForService();
      const calEvent = buildCalEvent();

      const result = await createEvent(credential, calEvent as never);

      expect(result.success).toBe(true);
      expect(result.uid).toBe("mock-uid-123");
      expect(result.iCalUID).toBe("ical-123@Cal.com");
      expect(result.createdEvent).toEqual(mockCreatedEvent);
      expect(result.type).toBe("google_calendar");
    });

    it("should return failure result when calendar.createEvent throws", async () => {
      mockGetCalendar.mockResolvedValue({
        createEvent: vi.fn().mockRejectedValue({ code: 500, calError: "Server error" }),
      });

      const credential = buildCredentialForService();
      const calEvent = buildCalEvent();

      const result = await createEvent(credential, calEvent as never);

      expect(result.success).toBe(false);
      expect(result.calError).toBe("Server error");
    });

    it("should handle 404 error gracefully", async () => {
      mockGetCalendar.mockResolvedValue({
        createEvent: vi.fn().mockRejectedValue({ code: 404 }),
      });

      const credential = buildCredentialForService();
      const calEvent = buildCalEvent();

      const result = await createEvent(credential, calEvent as never);

      expect(result.success).toBe(false);
      expect(result.createdEvent).toBeUndefined();
    });

    it("should return undefined createdEvent when no calendar adapter", async () => {
      mockGetCalendar.mockResolvedValue(null);

      const credential = buildCredentialForService();
      const calEvent = buildCalEvent();

      const result = await createEvent(credential, calEvent as never);

      expect(result.createdEvent).toBeUndefined();
    });

    it("should hide notes when hideCalendarNotes is true", async () => {
      const mockCreateEvent = vi.fn().mockResolvedValue({ id: "event-1" });
      mockGetCalendar.mockResolvedValue({ createEvent: mockCreateEvent });
      mockFormatCalEvent.mockImplementation((event: Record<string, unknown>) => ({
        ...event,
        hideCalendarNotes: true,
      }));

      const credential = buildCredentialForService();
      const calEvent = buildCalEvent();

      await createEvent(credential, calEvent as never);

      expect(mockFormatCalEvent).toHaveBeenCalled();
    });

    it("should pass externalId when credential is delegation credential", async () => {
      const mockCreateEvent = vi.fn().mockResolvedValue({ id: "event-1" });
      mockGetCalendar.mockResolvedValue({ createEvent: mockCreateEvent });

      const credential = buildCredentialForService({ delegatedToId: "delegation-123" });
      const calEvent = buildCalEvent();

      await createEvent(credential, calEvent as never, "ext-cal-id");

      expect(mockCreateEvent).toHaveBeenCalledWith(expect.anything(), credential.id, "ext-cal-id");
    });
  });

  describe("fn: updateEvent", () => {
    it("should return success result when calendar updates event", async () => {
      const mockUpdatedEvent = {
        id: "event-1",
        additionalInfo: { calWarnings: ["timezone mismatch"] },
      };
      mockGetCalendar.mockResolvedValue({
        updateEvent: vi.fn().mockResolvedValue(mockUpdatedEvent),
      });

      const credential = buildCredentialForService();
      const calEvent = buildCalEvent();

      const result = await updateEvent(credential, calEvent as never, "booking-ref-123", "ext-cal-id");

      expect(result.success).toBe(true);
      expect(result.updatedEvent).toEqual(mockUpdatedEvent);
      expect(result.calWarnings).toEqual(["timezone mismatch"]);
    });

    it("should return failure when no calendar adapter exists", async () => {
      mockGetCalendar.mockResolvedValue(null);

      const credential = buildCredentialForService();
      const calEvent = buildCalEvent();

      const result = await updateEvent(credential, calEvent as never, "booking-ref-123", null);

      expect(result.success).toBe(false);
      expect(result.updatedEvent).toBeUndefined();
    });

    it("should return failure when bookingRefUid is null", async () => {
      mockGetCalendar.mockResolvedValue({
        updateEvent: vi.fn().mockResolvedValue({ id: "event-1" }),
      });

      const credential = buildCredentialForService();
      const calEvent = buildCalEvent();

      const result = await updateEvent(credential, calEvent as never, null, null);

      expect(result.success).toBe(false);
    });

    it("should handle calError from updateEvent failure", async () => {
      mockGetCalendar.mockResolvedValue({
        updateEvent: vi.fn().mockRejectedValue({ calError: "Calendar sync failed" }),
      });

      const credential = buildCredentialForService();
      const calEvent = buildCalEvent();

      const result = await updateEvent(credential, calEvent as never, "booking-ref-123", null);

      expect(result.success).toBe(false);
      expect(result.calError).toBe("Calendar sync failed");
    });

    it("should handle array result from updateEvent", async () => {
      const mockUpdatedEvents = [
        { id: "event-1", additionalInfo: { calWarnings: ["warn1"] } },
        { id: "event-2", additionalInfo: { calWarnings: ["warn2"] } },
      ];
      mockGetCalendar.mockResolvedValue({
        updateEvent: vi.fn().mockResolvedValue(mockUpdatedEvents),
      });

      const credential = buildCredentialForService();
      const calEvent = buildCalEvent();

      const result = await updateEvent(credential, calEvent as never, "booking-ref-123", null);

      expect(result.success).toBe(true);
      expect(result.calWarnings).toEqual(["warn1", "warn2"]);
    });
  });

  describe("fn: deleteEvent", () => {
    it("should call calendar.deleteEvent when bookingRefUid is provided", async () => {
      const mockDeleteEvent = vi.fn().mockResolvedValue({});
      mockGetCalendar.mockResolvedValue({ deleteEvent: mockDeleteEvent });

      const credential = buildCredentialForService();
      const event = buildCalEvent();

      await deleteEvent({
        credential,
        bookingRefUid: "booking-ref-123",
        event: event as never,
        externalCalendarId: "ext-cal-id",
      });

      expect(mockDeleteEvent).toHaveBeenCalledWith("booking-ref-123", expect.anything(), "ext-cal-id");
    });

    it("should return empty object when no calendar adapter", async () => {
      mockGetCalendar.mockResolvedValue(null);

      const credential = buildCredentialForService();
      const event = buildCalEvent();

      const result = await deleteEvent({
        credential,
        bookingRefUid: "booking-ref-123",
        event: event as never,
      });

      expect(result).toEqual({});
    });
  });
});
