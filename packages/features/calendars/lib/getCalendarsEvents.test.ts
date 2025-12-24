import "../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import GoogleCalendarService from "@calcom/app-store/googlecalendar/lib/CalendarService";
import OfficeCalendarService from "@calcom/app-store/office365calendar/lib/CalendarService";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import type { SelectedCalendar } from "@calcom/prisma/client";
import type { EventBusyDate } from "@calcom/types/Calendar";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";

import getCalendarsEvents, {
  getCalendarsEventsWithTimezones,
  filterSelectedCalendarsForCredential,
} from "./getCalendarsEvents";

vi.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: vi.fn(),
}));

const mockedSymmetricDecrypt = vi.mocked(symmetricDecrypt);

vi.mock("@calcom/app-store/calendar.services.generated", () => {
  return {
    CalendarServiceMap: {
      googlecalendar: vi.importActual("@calcom/app-store/googlecalendar/lib/CalendarService"),
      office365calendar: vi.importActual("@calcom/app-store/office365calendar/lib/CalendarService"),
    },
  };
});

function buildDelegationCredential(credential: CredentialPayload): CredentialForCalendarService {
  return {
    ...credential,
    id: -1,
    delegatedTo: {
      serviceAccountKey: {
        client_email: "client_email",
        tenant_id: "tenant_id",
        client_id: "client_id",
        private_key: "private_key",
      },
    },
  };
}

function buildRegularCredential(credential: CredentialPayload): CredentialForCalendarService {
  return {
    ...credential,
    delegatedTo: null,
    delegatedToId: null,
  };
}

function buildSelectedCalendar(credential: {
  credentialId: number;
  externalId: string;
  integration: string;
  userId: number;
  id: string;
}): SelectedCalendar {
  return {
    googleChannelId: null,
    googleChannelKind: null,
    googleChannelResourceId: null,
    eventTypeId: null,
    googleChannelResourceUri: null,
    googleChannelExpiration: null,
    delegationCredentialId: null,
    domainWideDelegationCredentialId: null,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastErrorAt: null,
    watchAttempts: 0,
    unwatchAttempts: 0,
    maxAttempts: 3,
    ...credential,
  };
}

describe("getCalendarsEvents", () => {
  let credential: CredentialPayload;

  beforeEach(() => {
    vi.spyOn(logger.constructor.prototype, "debug");

    credential = {
      id: 303,
      type: "google_calendar",
      key: {
        scope: "example scope",
        token_type: "Bearer",
        expiry_date: Date.now() + 84000,
        access_token: "access token",
        refresh_token: "refresh token",
      },
      userId: 808,
      teamId: null,
      user: {
        email: "test@example.com",
      },
      appId: "exampleApp",
      invalid: false,
      delegationCredentialId: null,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Regular Credentials", () => {
    it("should return empty array if no calendar credentials", async () => {
      const result = await getCalendarsEvents(
        [
          buildRegularCredential({
            ...credential,
            type: "totally_unrelated",
          }),
        ],
        "2010-12-01",
        "2010-12-02",
        []
      );

      expect(result).toEqual([]);
    });

    it("should return unknown calendars as empty", async () => {
      const result = await getCalendarsEvents(
        [
          buildRegularCredential({
            ...credential,
            type: "unknown_calendar",
          }),
        ],
        "2010-12-01",
        "2010-12-02",
        []
      );

      expect(result).toEqual([[]]);
    });

    it("should return unmatched calendars as empty", async () => {
      const selectedCalendar: SelectedCalendar = buildSelectedCalendar({
        credentialId: 100,
        externalId: "externalId",
        integration: "office365_calendar",
        userId: 200,
        id: "id",
      });
      const result = await getCalendarsEvents(
        [
          buildRegularCredential({
            ...credential,
            type: "google_calendar",
          }),
        ],
        "2010-12-01",
        "2010-12-02",
        [selectedCalendar]
      );

      expect(result).toEqual([[]]);
    });

    it("should return availability from selected calendar", async () => {
      const availability: EventBusyDate[] = [
        {
          start: new Date(2010, 11, 2),
          end: new Date(2010, 11, 3),
        },
        {
          start: new Date(2010, 11, 2, 4),
          end: new Date(2010, 11, 2, 16),
        },
      ];

      const getAvailabilitySpy = vi
        .spyOn(GoogleCalendarService.prototype, "getAvailability")
        .mockReturnValue(Promise.resolve(availability));

      const selectedCalendar: SelectedCalendar = buildSelectedCalendar({
        credentialId: 100,
        externalId: "externalId",
        integration: "google_calendar",
        userId: 200,
        id: "id",
      });
      const result = await getCalendarsEvents(
        [
          buildRegularCredential({
            ...credential,
            type: "google_calendar",
          }),
        ],
        "2010-12-01",
        "2010-12-04",
        [selectedCalendar]
      );

      expect(getAvailabilitySpy).toHaveBeenCalledWith(
        "2010-12-01",
        "2010-12-04",
        [selectedCalendar],
        undefined,
        false
      );
      expect(result).toEqual([
        availability.map((av) => ({
          ...av,
          source: "exampleApp",
        })),
      ]);
    });

    it("should return availability from multiple calendars", async () => {
      const googleAvailability: EventBusyDate[] = [
        {
          start: new Date(2010, 11, 2),
          end: new Date(2010, 11, 3),
        },
      ];
      const officeAvailability: EventBusyDate[] = [
        {
          start: new Date(2010, 11, 2, 4),
          end: new Date(2010, 11, 2, 16),
        },
      ];

      const getGoogleAvailabilitySpy = vi
        .spyOn(GoogleCalendarService.prototype, "getAvailability")
        .mockReturnValue(Promise.resolve(googleAvailability));
      const getOfficeAvailabilitySpy = vi
        .spyOn(OfficeCalendarService.prototype, "getAvailability")
        .mockReturnValue(Promise.resolve(officeAvailability));

      const selectedGoogleCalendar: SelectedCalendar = buildSelectedCalendar({
        credentialId: 100,
        externalId: "externalId",
        integration: "google_calendar",
        userId: 200,
        id: "id",
      });
      const selectedOfficeCalendar: SelectedCalendar = buildSelectedCalendar({
        credentialId: 100,
        externalId: "externalId",
        integration: "office365_calendar",
        userId: 200,
        id: "id",
      });
      const result = await getCalendarsEvents(
        [
          buildRegularCredential({
            ...credential,
            type: "google_calendar",
          }),
          buildRegularCredential({
            ...credential,
            id: 304, // Different ID to ensure separate grouping
            type: "office365_calendar",
            key: {
              access_token: "access",
              refresh_token: "refresh",
              expires_in: Date.now() + 86400,
            },
          }),
        ],
        "2010-12-01",
        "2010-12-04",
        [selectedGoogleCalendar, selectedOfficeCalendar]
      );

      expect(getGoogleAvailabilitySpy).toHaveBeenCalledWith(
        "2010-12-01",
        "2010-12-04",
        [selectedGoogleCalendar],
        undefined,
        false
      );
      expect(getOfficeAvailabilitySpy).toHaveBeenCalledWith(
        "2010-12-01",
        "2010-12-04",
        [selectedOfficeCalendar],
        undefined,
        false
      );
      expect(result).toEqual([
        googleAvailability.map((av) => ({
          ...av,
          source: "exampleApp",
        })),
        officeAvailability.map((av) => ({
          ...av,
          source: "exampleApp",
        })),
      ]);
    });

    it("should not call getAvailability if selectedCalendars is empty", async () => {
      const getAvailabilitySpy = vi
        .spyOn(GoogleCalendarService.prototype, "getAvailability")
        .mockReturnValue(Promise.resolve([]));

      const result = await getCalendarsEvents(
        [buildRegularCredential(credential)],
        "2010-12-01",
        "2010-12-02",
        []
      );

      expect(getAvailabilitySpy).not.toHaveBeenCalled();
      expect(result).toEqual([[]]);
    });

    it("should handle different calendar providers (google, office365) independently without breaking batching", async () => {
      const startDate = "2010-12-01";
      const endDate = "2010-12-04";

      const googleAvailability: EventBusyDate[] = [
        { start: new Date(2010, 11, 2), end: new Date(2010, 11, 3) },
      ];
      const officeAvailability: EventBusyDate[] = [
        { start: new Date(2010, 11, 3, 14), end: new Date(2010, 11, 3, 15) },
      ];

      const getGoogleAvailabilitySpy = vi
        .spyOn(GoogleCalendarService.prototype, "getAvailability")
        .mockReturnValue(Promise.resolve(googleAvailability));
      const getOfficeAvailabilitySpy = vi
        .spyOn(OfficeCalendarService.prototype, "getAvailability")
        .mockReturnValue(Promise.resolve(officeAvailability));

      const googleCredential1: CredentialForCalendarService = buildRegularCredential({
        ...credential,
        id: 601,
        userId: 201,
        type: "google_calendar",
        appId: "google-calendar",
      });
      const googleCredential2: CredentialForCalendarService = buildRegularCredential({
        ...credential,
        id: 602,
        userId: 202,
        type: "google_calendar",
        appId: "google-calendar",
      });
      const officeCredential: CredentialForCalendarService = buildRegularCredential({
        ...credential,
        id: 603,
        userId: 203,
        type: "office365_calendar",
        appId: "office365-calendar",
        key: {
          access_token: "access",
          refresh_token: "refresh",
          expires_in: Date.now() + 86400,
        },
      });

      const googleCal1: SelectedCalendar = buildSelectedCalendar({
        credentialId: 601,
        externalId: "google1@example.com",
        integration: "google_calendar",
        userId: 201,
        id: "gcal1",
      });
      const googleCal2: SelectedCalendar = buildSelectedCalendar({
        credentialId: 602,
        externalId: "google2@example.com",
        integration: "google_calendar",
        userId: 202,
        id: "gcal2",
      });
      const officeCal: SelectedCalendar = buildSelectedCalendar({
        credentialId: 603,
        externalId: "office@example.com",
        integration: "office365_calendar",
        userId: 203,
        id: "ocal",
      });

      const result = await getCalendarsEvents(
        [googleCredential1, googleCredential2, officeCredential],
        startDate,
        endDate,
        [googleCal1, googleCal2, officeCal]
      );

      expect(getGoogleAvailabilitySpy).toHaveBeenCalledTimes(2);
      expect(getOfficeAvailabilitySpy).toHaveBeenCalledTimes(1);

      expect(getGoogleAvailabilitySpy).toHaveBeenCalledWith(
        startDate,
        endDate,
        expect.arrayContaining([expect.objectContaining({ externalId: "google1@example.com" })]),
        undefined,
        false
      );
      expect(getGoogleAvailabilitySpy).toHaveBeenCalledWith(
        startDate,
        endDate,
        expect.arrayContaining([expect.objectContaining({ externalId: "google2@example.com" })]),
        undefined,
        false
      );

      expect(getOfficeAvailabilitySpy).toHaveBeenCalledWith(
        startDate,
        endDate,
        expect.arrayContaining([expect.objectContaining({ externalId: "office@example.com" })]),
        undefined,
        false
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(
        googleAvailability.map((av) => ({ ...av, source: "google-calendar" }))
      );
      expect(result[1]).toEqual(
        googleAvailability.map((av) => ({ ...av, source: "google-calendar" }))
      );
      expect(result[2]).toEqual(
        officeAvailability.map((av) => ({ ...av, source: "office365-calendar" }))
      );
    });
  });

  describe("Delegation Credentials", () => {
    it("should allow getAvailability call even without any selected calendars with allowFallbackToPrimary=true", async () => {
      const startDate = "2010-12-01";
      const endDate = "2010-12-02";
      const delegationCredential: CredentialForCalendarService = buildDelegationCredential(credential);
      const credentials = [delegationCredential];
      const getAvailabilitySpy = vi
        .spyOn(GoogleCalendarService.prototype, "getAvailability")
        .mockReturnValue(Promise.resolve([]));

      const result = await getCalendarsEvents(credentials, startDate, endDate, []);

      expect(getAvailabilitySpy).toHaveBeenCalledWith(startDate, endDate, [], undefined, true);
      expect(result).toEqual([[]]);
    });

    it("should batch freebusy calls for multiple users with same delegation credential into a single call", async () => {
      const startDate = "2010-12-01";
      const endDate = "2010-12-04";
      const delegationCredentialId = 999;

      const availability: EventBusyDate[] = [
        { start: new Date(2010, 11, 2), end: new Date(2010, 11, 3) },
      ];

      const getAvailabilitySpy = vi
        .spyOn(GoogleCalendarService.prototype, "getAvailability")
        .mockReturnValue(Promise.resolve(availability));

      const user1Credential: CredentialForCalendarService = {
        ...buildDelegationCredential(credential),
        id: -1,
        userId: 101,
        delegatedToId: delegationCredentialId,
      };
      const user2Credential: CredentialForCalendarService = {
        ...buildDelegationCredential(credential),
        id: -2,
        userId: 102,
        delegatedToId: delegationCredentialId,
      };

      const user1Calendar: SelectedCalendar = buildSelectedCalendar({
        credentialId: -1,
        externalId: "user1@example.com",
        integration: "google_calendar",
        userId: 101,
        id: "cal1",
      });
      const user2Calendar: SelectedCalendar = buildSelectedCalendar({
        credentialId: -2,
        externalId: "user2@example.com",
        integration: "google_calendar",
        userId: 102,
        id: "cal2",
      });

      const result = await getCalendarsEvents(
        [user1Credential, user2Credential],
        startDate,
        endDate,
        [user1Calendar, user2Calendar]
      );

      expect(getAvailabilitySpy).toHaveBeenCalledTimes(1);
      expect(getAvailabilitySpy).toHaveBeenCalledWith(
        startDate,
        endDate,
        expect.arrayContaining([
          expect.objectContaining({ externalId: "user1@example.com" }),
          expect.objectContaining({ externalId: "user2@example.com" }),
        ]),
        undefined,
        true
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        availability.map((av) => ({ ...av, source: "exampleApp" }))
      );
    });

    it("should make separate calls for delegation credentials and own credentials", async () => {
      const startDate = "2010-12-01";
      const endDate = "2010-12-04";
      const delegationCredentialId = 999;

      const delegationAvailability: EventBusyDate[] = [
        { start: new Date(2010, 11, 2), end: new Date(2010, 11, 3) },
      ];
      const ownAvailability: EventBusyDate[] = [
        { start: new Date(2010, 11, 3, 10), end: new Date(2010, 11, 3, 11) },
      ];

      const getAvailabilitySpy = vi
        .spyOn(GoogleCalendarService.prototype, "getAvailability")
        .mockImplementation(async (from, to, calendars, cache, allowFallback) => {
          if (allowFallback) {
            return delegationAvailability;
          }
          return ownAvailability;
        });

      const delegationUser1: CredentialForCalendarService = {
        ...buildDelegationCredential(credential),
        id: -1,
        userId: 101,
        delegatedToId: delegationCredentialId,
      };
      const delegationUser2: CredentialForCalendarService = {
        ...buildDelegationCredential(credential),
        id: -2,
        userId: 102,
        delegatedToId: delegationCredentialId,
      };

      const ownCredential: CredentialForCalendarService = buildRegularCredential({
        ...credential,
        id: 500,
        userId: 103,
      });

      const delegationCal1: SelectedCalendar = buildSelectedCalendar({
        credentialId: -1,
        externalId: "delegation1@example.com",
        integration: "google_calendar",
        userId: 101,
        id: "dcal1",
      });
      const delegationCal2: SelectedCalendar = buildSelectedCalendar({
        credentialId: -2,
        externalId: "delegation2@example.com",
        integration: "google_calendar",
        userId: 102,
        id: "dcal2",
      });
      const ownCal: SelectedCalendar = buildSelectedCalendar({
        credentialId: 500,
        externalId: "own@example.com",
        integration: "google_calendar",
        userId: 103,
        id: "ocal",
      });

      const result = await getCalendarsEvents(
        [delegationUser1, delegationUser2, ownCredential],
        startDate,
        endDate,
        [delegationCal1, delegationCal2, ownCal]
      );

      expect(getAvailabilitySpy).toHaveBeenCalledTimes(2);

      expect(getAvailabilitySpy).toHaveBeenCalledWith(
        startDate,
        endDate,
        expect.arrayContaining([
          expect.objectContaining({ externalId: "delegation1@example.com" }),
          expect.objectContaining({ externalId: "delegation2@example.com" }),
        ]),
        undefined,
        true
      );

      expect(getAvailabilitySpy).toHaveBeenCalledWith(
        startDate,
        endDate,
        expect.arrayContaining([expect.objectContaining({ externalId: "own@example.com" })]),
        undefined,
        false
      );

      expect(result).toHaveLength(2);
    });
  });
});

describe("getCalendarsEventsWithTimezones", () => {
  let credential: CredentialPayload;

  beforeEach(() => {
    vi.spyOn(logger.constructor.prototype, "debug");

    credential = {
      id: 303,
      type: "google_calendar",
      key: {
        scope: "example scope",
        token_type: "Bearer",
        expiry_date: Date.now() + 84000,
        access_token: "access token",
        refresh_token: "refresh token",
      },
      userId: 808,
      teamId: null,
      user: {
        email: "test@example.com",
      },
      appId: "exampleApp",
      invalid: false,
      delegationCredentialId: null,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Regular Credentials", () => {
    it("should return empty array if no calendar credentials", async () => {
      const result = await getCalendarsEventsWithTimezones(
        [
          buildRegularCredential({
            ...credential,
            type: "totally_unrelated",
          }),
        ],
        "2010-12-01",
        "2010-12-02",
        []
      );

      expect(result).toEqual([]);
    });

    it("should return unknown calendars as empty", async () => {
      const result = await getCalendarsEventsWithTimezones(
        [
          buildRegularCredential({
            ...credential,
            type: "unknown_calendar",
          }),
        ],
        "2010-12-01",
        "2010-12-02",
        []
      );

      expect(result).toEqual([]);
    });

    it("should return unmatched calendars as empty", async () => {
      const selectedCalendar: SelectedCalendar = buildSelectedCalendar({
        credentialId: 100,
        externalId: "externalId",
        integration: "office365_calendar",
        userId: 200,
        id: "id",
      });
      const result = await getCalendarsEventsWithTimezones(
        [
          buildRegularCredential({
            ...credential,
            type: "google_calendar",
          }),
        ],
        "2010-12-01",
        "2010-12-02",
        [selectedCalendar]
      );

      expect(result).toEqual([[]]);
    });

    it("should return availability from selected calendar", async () => {
      const availability = [
        {
          start: new Date(2010, 11, 2),
          end: new Date(2010, 11, 3),
          timeZone: "America/New_York",
        },
        {
          start: new Date(2010, 11, 2, 4),
          end: new Date(2010, 11, 2, 16),
          timeZone: "America/New_York",
        },
      ];

      const getAvailabilityWithTimezonesSpy = vi
        .spyOn(GoogleCalendarService.prototype, "getAvailabilityWithTimeZones")
        .mockReturnValue(Promise.resolve(availability));

      const selectedCalendar: SelectedCalendar = buildSelectedCalendar({
        credentialId: 100,
        externalId: "externalId",
        integration: "google_calendar",
        userId: 200,
        id: "id",
      });
      const result = await getCalendarsEventsWithTimezones(
        [
          buildRegularCredential({
            ...credential,
            type: "google_calendar",
          }),
        ],
        "2010-12-01",
        "2010-12-04",
        [selectedCalendar]
      );

      expect(getAvailabilityWithTimezonesSpy).toHaveBeenCalledWith(
        "2010-12-01",
        "2010-12-04",
        [selectedCalendar],
        false
      );
      expect(result).toEqual([
        availability.map((av) => ({
          ...av,
        })),
      ]);
    });

    it("should not call getAvailabilityWithTimezones if selectedCalendars is empty", async () => {
      const getAvailabilityWithTimezonesSpy = vi
        .spyOn(GoogleCalendarService.prototype, "getAvailabilityWithTimeZones")
        .mockReturnValue(Promise.resolve([]));

      const result = await getCalendarsEventsWithTimezones(
        [buildRegularCredential(credential)],
        "2010-12-01",
        "2010-12-02",
        []
      );

      expect(getAvailabilityWithTimezonesSpy).not.toHaveBeenCalled();
      expect(result).toEqual([[]]);
    });
  });

  describe("Delegation Credentials", () => {
    it("should allow getAvailabilityWithTimezones call even without any selected calendars with allowFallbackToPrimary=true", async () => {
      const startDate = "2010-12-01";
      const endDate = "2010-12-02";
      const delegationCredential: CredentialForCalendarService = buildDelegationCredential(credential);
      const credentials = [delegationCredential];
      const getAvailabilityWithTimezonesSpy = vi
        .spyOn(GoogleCalendarService.prototype, "getAvailabilityWithTimeZones")
        .mockReturnValue(Promise.resolve([]));

      const result = await getCalendarsEventsWithTimezones(credentials, startDate, endDate, []);

      expect(getAvailabilityWithTimezonesSpy).toHaveBeenCalledWith(startDate, endDate, [], true);
      expect(result).toEqual([[]]);
    });
  });
});

// CalDAV Credential Leak Prevention Tests
describe("CalDAV credential leak prevention", () => {
  function buildCalDAVCredential(data: {
    id: number;
    key: string;
    userId?: number;
  }): CredentialForCalendarService {
    return {
      id: data.id,
      type: "caldav_calendar",
      key: data.key,
      userId: data.userId || 1,
      user: { email: "test@example.com" },
      teamId: null,
      appId: "caldav-calendar",
      invalid: false,
      delegatedTo: null,
      delegationCredentialId: null,
    };
  }

  function buildCalDAVSelectedCalendar(data: {
    id: string;
    externalId: string;
    credentialId?: number;
  }): SelectedCalendar {
    return {
      id: data.id,
      userId: 1,
      integration: "caldav_calendar",
      externalId: data.externalId,
      credentialId: data.credentialId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      googleChannelId: null,
      googleChannelKind: null,
      googleChannelResourceId: null,
      googleChannelResourceUri: null,
      googleChannelExpiration: null,
      delegationCredentialId: null,
      domainWideDelegationCredentialId: null,
      error: null,
      lastErrorAt: null,
      watchAttempts: 0,
      unwatchAttempts: 0,
      maxAttempts: 3,
      eventTypeId: null,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("filterSelectedCalendarsForCredential", () => {
    it("prevents CalDAV credential leak by matching server URLs", () => {
      // Setup: Two CalDAV servers with different URLs
      const serverACredential = buildCalDAVCredential({
        id: 1,
        key: "encrypted_server_a_key",
      });

      const serverBCredential = buildCalDAVCredential({
        id: 2,
        key: "encrypted_server_b_key",
      });

      // Mock encrypted credential data for different servers
      mockedSymmetricDecrypt
        .mockReturnValueOnce(
          JSON.stringify({
            username: "user_a",
            password: "pass_a",
            url: "https://server-a.example.com/dav/calendars/user/",
          })
        )
        .mockReturnValueOnce(
          JSON.stringify({
            username: "user_b",
            password: "pass_b",
            url: "https://server-b.example.com/dav/calendars/user/",
          })
        );

      // Selected calendars from both servers
      const selectedCalendars = [
        buildCalDAVSelectedCalendar({
          id: "cal_1",
          externalId: "https://server-a.example.com/dav/calendars/user/calendar1/",
          credentialId: 1,
        }),
        buildCalDAVSelectedCalendar({
          id: "cal_2",
          externalId: "https://server-b.example.com/dav/calendars/user/calendar2/",
          credentialId: 2,
        }),
      ];

      // Test Server A credential - should only return Server A calendars
      const serverACalendars = filterSelectedCalendarsForCredential(selectedCalendars, serverACredential);
      expect(serverACalendars).toHaveLength(1);
      expect(serverACalendars[0].externalId).toBe(
        "https://server-a.example.com/dav/calendars/user/calendar1/"
      );

      // Test Server B credential - should only return Server B calendars
      const serverBCalendars = filterSelectedCalendarsForCredential(selectedCalendars, serverBCredential);
      expect(serverBCalendars).toHaveLength(1);
      expect(serverBCalendars[0].externalId).toBe(
        "https://server-b.example.com/dav/calendars/user/calendar2/"
      );
    });

    it("demonstrates the credential leak that existed before the fix", () => {
      // This test shows what WOULD happen with naive filtering (integration type only)
      const serverACredential = buildCalDAVCredential({
        id: 1,
        key: "encrypted_server_a_key",
      });

      const selectedCalendars = [
        buildCalDAVSelectedCalendar({
          id: "cal_1",
          externalId: "https://server-a.example.com/dav/calendars/user/calendar1/",
          credentialId: 1,
        }),
        buildCalDAVSelectedCalendar({
          id: "cal_2",
          externalId: "https://server-b.example.com/dav/calendars/user/calendar2/",
          credentialId: 2,
        }),
      ];

      // Legacy filtering (type-only) would return ALL CalDAV calendars
      const legacyFiltering = selectedCalendars.filter((sc) => sc.integration === "caldav_calendar");
      expect(legacyFiltering).toHaveLength(2); // This demonstrates the leak - both calendars returned

      // Our new filtering prevents this
      mockedSymmetricDecrypt.mockReturnValue(
        JSON.stringify({
          username: "user_a",
          password: "pass_a",
          url: "https://server-a.example.com/dav/calendars/user/",
        })
      );

      const secureFiltering = filterSelectedCalendarsForCredential(selectedCalendars, serverACredential);
      expect(secureFiltering).toHaveLength(1); // Only calendars from matching server
      expect(secureFiltering[0].externalId).toContain("server-a.example.com");
    });

    it("handles non-CalDAV calendars normally", () => {
      const googleCredential: CredentialForCalendarService = {
        id: 1,
        type: "google_calendar",
        key: "google_key",
        userId: 1,
        user: { email: "test@example.com" },
        teamId: null,
        appId: "google-calendar",
        invalid: false,
        delegatedTo: null,
        delegationCredentialId: null,
      };

      const selectedCalendars = [
        buildCalDAVSelectedCalendar({
          id: "cal_1",
          externalId: "https://server-a.example.com/dav/calendars/user/calendar1/",
        }),
        {
          ...buildCalDAVSelectedCalendar({
            id: "cal_2",
            externalId: "primary",
          }),
          integration: "google_calendar",
        },
      ];

      const googleCalendars = filterSelectedCalendarsForCredential(selectedCalendars, googleCredential);
      expect(googleCalendars).toHaveLength(1);
      expect(googleCalendars[0].integration).toBe("google_calendar");
    });

    it("handles invalid CalDAV credential URLs gracefully", () => {
      const invalidCredential = buildCalDAVCredential({
        id: 1,
        key: "encrypted_invalid_key",
      });

      mockedSymmetricDecrypt.mockReturnValue(
        JSON.stringify({
          username: "user",
          password: "pass",
          url: "invalid-url-format",
        })
      );

      const selectedCalendars = [
        buildCalDAVSelectedCalendar({
          id: "cal_1",
          externalId: "https://server-a.example.com/dav/calendars/user/calendar1/",
        }),
      ];

      const result = filterSelectedCalendarsForCredential(selectedCalendars, invalidCredential);
      expect(result).toHaveLength(0); // Should return empty array for safety
    });
  });
});
