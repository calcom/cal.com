import type { SelectedCalendar } from "@prisma/client";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import GoogleCalendarService from "@calcom/app-store/googlecalendar/lib/CalendarService";
import OfficeCalendarService from "@calcom/app-store/office365calendar/lib/CalendarService";
import logger from "@calcom/lib/logger";
import type { EventBusyDate } from "@calcom/types/Calendar";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";

import getCalendarsEvents, { getCalendarsEventsWithTimezones } from "./getCalendarsEvents";

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
      appId: "exampleApp",
      invalid: false,
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
      user: null,
      appId: "exampleApp",
      invalid: false,
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
