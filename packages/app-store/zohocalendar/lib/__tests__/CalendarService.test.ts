import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { generateJsonResponse } from "@calcom/app-store/_utils/testUtils";
import type { CalendarServiceEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import BuildCalendarService from "../CalendarService";

vi.mock("@calcom/prisma", () => ({
  default: {
    credential: {
      update: vi.fn(),
    },
  },
}));

const mockCredentialId = 1;
const mockUserId = 2;
const mockEventUid = "78fb74a782f94f7bb307201f5b43f086@zoho.com";
const mockCredential: CredentialPayload = {
  id: mockCredentialId,
  userId: mockUserId,
  appId: "zohocalendar",
  type: "zoho_calendar",
  key: {
    access_token: "valid-access-token",
    refresh_token: "valid-refresh-token",
    expires_in: Math.round(Date.now() / 1000) + 3600,
    server_location: "com",
  },
  encryptedKey: null,
  teamId: null,
  invalid: null,
  delegationCredentialId: null,
  user: null,
};

function buildTestCalEvent(overrides: Partial<CalendarServiceEvent> = {}): CalendarServiceEvent {
  return {
    type: "test-event-type",
    uid: "cal-event-uid-123",
    title: "Test Meeting",
    startTime: "2024-06-15T10:00:00Z",
    endTime: "2024-06-15T11:00:00Z",
    organizer: {
      name: "Test Organizer",
      email: "organizer@example.com",
      timeZone: "UTC",
      language: {
        locale: "en",
        translate: (...args: any[]) => args[0], // Mock translate function,
      },
    },
    attendees: [
      {
        name: "Test Attendee",
        email: "attendee@example.com",
        timeZone: "UTC",
        language: {
          locale: "en",
          translate: (...args: any[]) => args[0], // Mock translate function,
        },
      },
    ],
    calendarDescription: "Test meeting description",
    destinationCalendar: [
      {
        integration: "zoho_calendar",
        externalId: "849d6badb4e04acc91860c43db0fb109",
        id: 1,
        userId: mockUserId,
        delegationCredentialId: null,
        eventTypeId: null,
        primaryEmail: null,
        credentialId: mockCredentialId,
        createdAt: new Date(),
        updatedAt: new Date(),
        customCalendarReminder: null,
      },
    ],
    ...overrides,
  };
}

function parseEventDataFromRequestUrl(url: string) {
  const queryString = url.split("?")[1] ?? "";
  const params = new URLSearchParams(queryString);
  const eventdata = params.get("eventdata");
  if (!eventdata) {
    throw new Error("eventdata query parameter not found");
  }
  return JSON.parse(eventdata) as Record<string, unknown>;
}

describe("ZohoCalendarService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createEvent", () => {
    test("should send notify_attendee 0 to suppress Zoho attendee notifications", async () => {
      fetchMock.mockResolvedValueOnce(
        generateJsonResponse({
          json: { events: [{ uid: mockEventUid, etag: "1669788841981" }] },
        })
      );

      const calendarService = BuildCalendarService(mockCredential);
      await calendarService.createEvent(buildTestCalEvent(), mockCredentialId);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(requestUrl).toContain("/calendars/849d6badb4e04acc91860c43db0fb109/events");
      expect(requestInit.method).toBe("POST");

      const eventData = parseEventDataFromRequestUrl(requestUrl);
      expect(eventData.notify_attendee).toBe(0);
    });
  });

  describe("updateEvent", () => {
    test("should send notify_attendee 0 when updating an event", async () => {
      fetchMock
        .mockResolvedValueOnce(
          generateJsonResponse({
            json: { events: [{ uid: mockEventUid, etag: "1669788841981" }] },
          })
        )
        .mockResolvedValueOnce(
          generateJsonResponse({
            json: { events: [{ uid: mockEventUid, etag: "1669788842981" }] },
          })
        );

      const calendarService = BuildCalendarService(mockCredential);
      await calendarService.updateEvent(mockEventUid, buildTestCalEvent());

      expect(fetchMock).toHaveBeenCalledTimes(2);

      const updateCall = fetchMock.mock.calls[1] as [string, RequestInit];
      const [requestUrl, requestInit] = updateCall;
      expect(requestUrl).toContain(`/calendars/849d6badb4e04acc91860c43db0fb109/events/${mockEventUid}`);
      expect(requestInit.method).toBe("PUT");

      const eventData = parseEventDataFromRequestUrl(requestUrl);
      expect(eventData.notify_attendee).toBe(0);
    });
  });

  describe("deleteEvent", () => {
    test("should send notify_attendee 0 when deleting an event", async () => {
      fetchMock
        .mockResolvedValueOnce(
          generateJsonResponse({
            json: { events: [{ uid: mockEventUid, etag: "1669788841981" }] },
          })
        )
        .mockResolvedValueOnce(
          generateJsonResponse({
            json: { events: [{ uid: mockEventUid, estatus: "deleted" }] },
          })
        );

      const calendarService = BuildCalendarService(mockCredential);
      await calendarService.deleteEvent(mockEventUid, buildTestCalEvent());

      expect(fetchMock).toHaveBeenCalledTimes(2);

      const deleteCall = fetchMock.mock.calls[1] as [string, RequestInit];
      const [requestUrl, requestInit] = deleteCall;
      expect(requestUrl).toContain(`/calendars/849d6badb4e04acc91860c43db0fb109/events/${mockEventUid}`);
      expect(requestInit.method).toBe("DELETE");

      const eventData = parseEventDataFromRequestUrl(requestUrl);
      expect(eventData.notify_attendee).toBe(0);
      expect(eventData.uid).toBe(mockEventUid);
    });
  });
});
