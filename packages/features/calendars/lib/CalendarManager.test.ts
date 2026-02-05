import { prisma } from "@calcom/prisma/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { getCalendarCredentials, deduplicateCredentialsBasedOnSelectedCalendars, deleteEvent } from "./CalendarManager";

vi.mock("@calcom/prisma", () => ({
  prisma,
}));

vi.mock("@calcom/app-store/_utils/getCalendar", () => ({
  getCalendar: vi.fn(),
}));

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";

const mockedGetCalendar = vi.mocked(getCalendar);

function buildCredential(data: {
  type: string;
  appId: string;
  id: number;
  delegatedToId: string | null;
  user: { email: string } | null;
}) {
  return {
    ...data,
    teamId: null,
    invalid: false,
    key: { access_token: "DONT_MATTER" },
    userId: 10000,
    delegatedTo: {
      serviceAccountKey: {
        client_email: "DONT_MATTER",
        tenant_id: "DONT_MATTER",
        client_id: "DONT_MATTER",
        private_key: "DONT_MATTER",
      },
    },
  };
}

function buildCalendarCredentialForDelete() {
  return {
    id: 1,
    type: "google_calendar",
    key: { access_token: "test_token" },
    userId: 1,
    user: { email: "test@example.com" },
    teamId: null,
    appId: "google-calendar",
    invalid: false,
    appName: "Google Calendar",
  };
}

function buildCalendarEvent() {
  return {
    type: "test_event",
    title: "Test Event",
    description: "Test Description",
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    organizer: {
      email: "organizer@example.com",
      name: "Organizer",
      timeZone: "UTC",
      language: { locale: "en" },
    },
    attendees: [],
    location: "Test Location",
    uid: "test-uid",
  };
}

describe("CalendarManager tests", () => {
  describe("fn: getCalendarCredentials", () => {
    it("should only return credentials for calendar apps", async () => {
      const googleCalendarCredentials = {
        id: "1",
        appId: "google-calendar",
        type: "google_calendar",
        userId: "3",
        key: {
          access_token: "google_calendar_key",
        },
        invalid: false,
        delegatedTo: null,
      };

      const credentials = [
        googleCalendarCredentials,
        {
          id: "2",
          appId: "office365-video",
          type: "office365_video",
          userId: "4",
          key: {
            access_token: "office365_video_key",
          },
          invalid: false,
        },
      ];

      const calendarCredentials = getCalendarCredentials(credentials);
      expect(calendarCredentials).toHaveLength(1);
      expect(calendarCredentials[0].credential).toEqual(googleCalendarCredentials);
    });
  });

  describe("fn: deduplicateCredentialsBasedOnSelectedCalendars", () => {
    it("should remove a regular credential for which a delegation credential exists i.e. both are fetching events for same externalId", () => {
      const calcomUser = {
        email: "owner@hariombalhara.net",
      };

      const externalIdSameAsCalcomUserEmail = calcomUser.email;
      const externalIdDifferentFromCalcomUserEmail = "hariombalhara@gmail.com";

      // Delegation Credential(Calendar)
      const delegationCredentialCalendarForCalcomEmail = buildCredential({
        type: "google_calendar",
        appId: "google-calendar",
        id: -1,
        delegatedToId: "45fa8f04-e891-417b-98e1-abf48e8ae18a",
        user: calcomUser,
      });

      // Delegation Credential(Conferencing)
      const delegationCredentialConferencingForCalcomEmail = buildCredential({
        type: "google_video",
        appId: "google-meet",
        id: -1,
        delegatedToId: "45fa8f04-e891-417b-98e1-abf48e8ae18a",
        user: calcomUser,
      });

      // Regular Credential for owner@hariombalhara.net
      const regularCredentialForCalcomEmail = buildCredential({
        id: 2,
        appId: "google-calendar",
        type: "google_calendar",
        delegatedToId: null,
        user: calcomUser,
      });

      // Regular Credential for hariombalhara@gmail.com
      const regularCredentialForSomeOtherEmail = buildCredential({
        id: 3,
        appId: "google-calendar",
        type: "google_calendar",
        delegatedToId: null,
        user: calcomUser,
      });

      const credentials = [
        delegationCredentialCalendarForCalcomEmail,
        delegationCredentialConferencingForCalcomEmail,
        // This one is duplicate
        regularCredentialForCalcomEmail,
        // Regular Credential for hariombalhara@gmail.com
        regularCredentialForSomeOtherEmail,
      ];

      const selectedCalendars = [
        {
          id: "62f4f3b7-c65b-4199-8052-25b91ee25ff2",
          userId: 23,
          integration: "google_calendar",
          externalId: externalIdDifferentFromCalcomUserEmail,
          credentialId: regularCredentialForSomeOtherEmail.id,
          delegationCredentialId: null,
          eventTypeId: null,
        },
        {
          id: "418e1bd0-7bde-4ea6-b03a-b2b6de6af497",
          userId: 23,
          integration: "google_calendar",
          externalId: externalIdSameAsCalcomUserEmail,
          credentialId: regularCredentialForCalcomEmail.id,
          delegationCredentialId: null,
          eventTypeId: null,
        },
      ];

      const uniqueCredentials = deduplicateCredentialsBasedOnSelectedCalendars({
        credentials,
        selectedCalendars,
      });
      expect(uniqueCredentials).toHaveLength(3);
      expect(uniqueCredentials).toEqual([
        delegationCredentialCalendarForCalcomEmail,
        delegationCredentialConferencingForCalcomEmail,
        regularCredentialForSomeOtherEmail,
      ]);
    });

    it("should not remove a regular credential for which a delegation credential exists i.e. both are fetching events for same externalId if integration is different", () => {
      const calcomUser = {
        email: "owner@hariombalhara.net",
      };

      const externalIdSameAsCalcomUserEmail = calcomUser.email;
      const externalIdDifferentFromCalcomUserEmail = "hariombalhara@gmail.com";

      // Delegation Credential(Calendar) - wrong integration type
      const delegationCredentialCalendarForCalcomEmail = buildCredential({
        type: "google_calendar_wrong_type",
        appId: "google-calendar",
        id: -1,
        delegatedToId: "45fa8f04-e891-417b-98e1-abf48e8ae18a",
        user: calcomUser,
      });

      // Delegation Credential(Conferencing)
      const delegationCredentialConferencingForCalcomEmail = buildCredential({
        type: "google_video",
        appId: "google-meet",
        id: -1,
        delegatedToId: "45fa8f04-e891-417b-98e1-abf48e8ae18a",
        user: calcomUser,
      });

      // Regular Credential for owner@hariombalhara.net
      const regularCredentialForCalcomEmail = buildCredential({
        id: 2,
        appId: "google-calendar",
        type: "google_calendar",
        delegatedToId: null,
        user: calcomUser,
      });

      // Regular Credential for hariombalhara@gmail.com
      const regularCredentialForSomeOtherEmail = buildCredential({
        id: 3,
        appId: "google-calendar",
        type: "google_calendar",
        delegatedToId: null,
        user: calcomUser,
      });

      const credentials = [
        delegationCredentialCalendarForCalcomEmail,
        delegationCredentialConferencingForCalcomEmail,
        // This one won't be removed as integration is different
        regularCredentialForCalcomEmail,
        // Regular Credential for hariombalhara@gmail.com
        regularCredentialForSomeOtherEmail,
      ];

      const selectedCalendars = [
        {
          id: "62f4f3b7-c65b-4199-8052-25b91ee25ff2",
          userId: 23,
          integration: "google_calendar",
          externalId: externalIdDifferentFromCalcomUserEmail,
          credentialId: regularCredentialForSomeOtherEmail.id,
          delegationCredentialId: null,
          eventTypeId: null,
        },
        {
          id: "418e1bd0-7bde-4ea6-b03a-b2b6de6af497",
          userId: 23,
          integration: "google_calendar",
          externalId: externalIdSameAsCalcomUserEmail,
          credentialId: regularCredentialForCalcomEmail.id,
          delegationCredentialId: null,
          eventTypeId: null,
        },
      ];

      const uniqueCredentials = deduplicateCredentialsBasedOnSelectedCalendars({
        credentials,
        selectedCalendars,
      });
      expect(uniqueCredentials).toHaveLength(4);
      expect(uniqueCredentials).toEqual([
        delegationCredentialCalendarForCalcomEmail,
        delegationCredentialConferencingForCalcomEmail,
        regularCredentialForCalcomEmail,
        regularCredentialForSomeOtherEmail,
      ]);
    });

    it("should return empty array when credentials array is empty", () => {
      const selectedCalendars = [
        {
          id: "calendar-1",
          userId: 23,
          integration: "google_calendar",
          externalId: "test@example.com",
          credentialId: 1,
          delegationCredentialId: null,
          eventTypeId: null,
        },
      ];

      const uniqueCredentials = deduplicateCredentialsBasedOnSelectedCalendars({
        credentials: [],
        selectedCalendars,
      });
      expect(uniqueCredentials).toHaveLength(0);
    });

    it("should return original credentials when user email is not present", () => {
      const credentialsWithoutUserEmail = [
        buildCredential({
          type: "google_calendar",
          appId: "google-calendar",
          id: 1,
          delegatedToId: null,
          user: null,
        }),
        buildCredential({
          type: "google_calendar",
          appId: "google-calendar",
          id: -1,
          delegatedToId: "delegation-1",
          user: null,
        }),
      ];

      const selectedCalendars = [
        {
          id: "calendar-1",
          userId: 23,
          integration: "google_calendar",
          externalId: "test@example.com",
          credentialId: 1,
          delegationCredentialId: null,
          eventTypeId: null,
        },
      ];

      const uniqueCredentials = deduplicateCredentialsBasedOnSelectedCalendars({
        credentials: credentialsWithoutUserEmail,
        selectedCalendars,
      });
      expect(uniqueCredentials).toEqual(credentialsWithoutUserEmail);
    });

    it("should return original credentials when no delegation credentials exist", () => {
      const regularCredentials = [
        buildCredential({
          type: "google_calendar",
          appId: "google-calendar",
          id: 1,
          delegatedToId: null,
          user: { email: "test@example.com" },
        }),
        buildCredential({
          type: "google_calendar",
          appId: "google-calendar",
          id: 2,
          delegatedToId: null,
          user: { email: "test@example.com" },
        }),
      ];

      const selectedCalendars = [
        {
          id: "calendar-1",
          userId: 23,
          integration: "google_calendar",
          externalId: "test@example.com",
          credentialId: 1,
          delegationCredentialId: null,
          eventTypeId: null,
        },
      ];

      const uniqueCredentials = deduplicateCredentialsBasedOnSelectedCalendars({
        credentials: regularCredentials,
        selectedCalendars,
      });
      expect(uniqueCredentials).toEqual(regularCredentials);
    });

    it("should return original credentials when no matching selected calendars exist", () => {
      const credentials = [
        buildCredential({
          type: "google_calendar",
          appId: "google-calendar",
          id: 1,
          delegatedToId: "delegation-1",
          user: { email: "test@example.com" },
        }),
        buildCredential({
          type: "google_calendar",
          appId: "google-calendar",
          id: 2,
          delegatedToId: null,
          user: { email: "test@example.com" },
        }),
      ];

      const selectedCalendars = [
        {
          id: "calendar-1",
          userId: 23,
          integration: "google_calendar",
          externalId: "different@example.com", // Different email than the credentials
          credentialId: 1,
          delegationCredentialId: null,
          eventTypeId: null,
        },
      ];

      const uniqueCredentials = deduplicateCredentialsBasedOnSelectedCalendars({
        credentials,
        selectedCalendars,
      });
      expect(uniqueCredentials).toEqual(credentials);
    });
  });

  describe("fn: deleteEvent", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return early and not call calendar.deleteEvent when bookingRefUid is empty string", async () => {
      const mockCalendarDeleteEvent = vi.fn();
      const mockCalendar = {
        deleteEvent: mockCalendarDeleteEvent,
      };
      mockedGetCalendar.mockResolvedValue(mockCalendar as any);

      const credential = buildCalendarCredentialForDelete();
      const event = buildCalendarEvent();

      const result = await deleteEvent({
        credential: credential as any,
        bookingRefUid: "",
        event: event as any,
        externalCalendarId: "calendar-id",
      });

      expect(result).toEqual({});
      expect(mockedGetCalendar).not.toHaveBeenCalled();
      expect(mockCalendarDeleteEvent).not.toHaveBeenCalled();
    });

    it("should return early and not call calendar.deleteEvent when bookingRefUid is undefined", async () => {
      const mockCalendarDeleteEvent = vi.fn();
      const mockCalendar = {
        deleteEvent: mockCalendarDeleteEvent,
      };
      mockedGetCalendar.mockResolvedValue(mockCalendar as any);

      const credential = buildCalendarCredentialForDelete();
      const event = buildCalendarEvent();

      const result = await deleteEvent({
        credential: credential as any,
        bookingRefUid: undefined as any,
        event: event as any,
        externalCalendarId: "calendar-id",
      });

      expect(result).toEqual({});
      expect(mockedGetCalendar).not.toHaveBeenCalled();
      expect(mockCalendarDeleteEvent).not.toHaveBeenCalled();
    });

    it("should return early and not call calendar.deleteEvent when bookingRefUid is null", async () => {
      const mockCalendarDeleteEvent = vi.fn();
      const mockCalendar = {
        deleteEvent: mockCalendarDeleteEvent,
      };
      mockedGetCalendar.mockResolvedValue(mockCalendar as any);

      const credential = buildCalendarCredentialForDelete();
      const event = buildCalendarEvent();

      const result = await deleteEvent({
        credential: credential as any,
        bookingRefUid: null as any,
        event: event as any,
        externalCalendarId: "calendar-id",
      });

      expect(result).toEqual({});
      expect(mockedGetCalendar).not.toHaveBeenCalled();
      expect(mockCalendarDeleteEvent).not.toHaveBeenCalled();
    });

    it("should call calendar.deleteEvent when bookingRefUid is valid", async () => {
      const mockCalendarDeleteEvent = vi.fn().mockResolvedValue({ success: true });
      const mockCalendar = {
        deleteEvent: mockCalendarDeleteEvent,
      };
      mockedGetCalendar.mockResolvedValue(mockCalendar as any);

      const credential = buildCalendarCredentialForDelete();
      const event = buildCalendarEvent();
      const bookingRefUid = "valid-booking-ref-uid";
      const externalCalendarId = "calendar-id";

      const result = await deleteEvent({
        credential: credential as any,
        bookingRefUid,
        event: event as any,
        externalCalendarId,
      });

      expect(result).toEqual({ success: true });
      expect(mockedGetCalendar).toHaveBeenCalledWith(credential, "booking");
      expect(mockCalendarDeleteEvent).toHaveBeenCalledWith(bookingRefUid, event, externalCalendarId);
    });

    it("should return empty object when calendar is not available", async () => {
      mockedGetCalendar.mockResolvedValue(null);

      const credential = buildCalendarCredentialForDelete();
      const event = buildCalendarEvent();

      const result = await deleteEvent({
        credential: credential as any,
        bookingRefUid: "valid-uid",
        event: event as any,
        externalCalendarId: "calendar-id",
      });

      expect(result).toEqual({});
      expect(mockedGetCalendar).toHaveBeenCalledWith(credential, "booking");
    });
  });
});