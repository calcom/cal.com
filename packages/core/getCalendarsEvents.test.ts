import type { SelectedCalendar } from "@prisma/client";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import GoogleCalendarService from "@calcom/app-store/googlecalendar/lib/CalendarService";
import OfficeCalendarService from "@calcom/app-store/office365calendar/lib/CalendarService";
import logger from "@calcom/lib/logger";
import type { EventBusyDate } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import getCalendarsEvents from "./getCalendarsEvents";

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
      subscriptionId: null,
      paymentStatus: null,
      billingCycleStart: null,
      invalid: false,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return empty array if no calendar credentials", async () => {
    const result = await getCalendarsEvents(
      [
        {
          ...credential,
          type: "totally_unrelated",
        },
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
        {
          ...credential,
          type: "unknown_calendar",
        },
      ],
      "2010-12-01",
      "2010-12-02",
      []
    );

    expect(result).toEqual([[]]);
  });

  it("should return unmatched calendars as empty", async () => {
    const selectedCalendar: SelectedCalendar = {
      credentialId: 100,
      externalId: "externalId",
      integration: "office365_calendar",
      userId: 200,
    };
    const result = await getCalendarsEvents(
      [
        {
          ...credential,
          type: "google_calendar",
        },
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

    const selectedCalendar: SelectedCalendar = {
      credentialId: 100,
      externalId: "externalId",
      integration: "google_calendar",
      userId: 200,
    };
    const result = await getCalendarsEvents(
      [
        {
          ...credential,
          type: "google_calendar",
        },
      ],
      "2010-12-01",
      "2010-12-04",
      [selectedCalendar]
    );

    expect(getAvailabilitySpy).toHaveBeenCalledWith("2010-12-01", "2010-12-04", [selectedCalendar]);
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

    const selectedGoogleCalendar: SelectedCalendar = {
      credentialId: 100,
      externalId: "externalId",
      integration: "google_calendar",
      userId: 200,
    };
    const selectedOfficeCalendar: SelectedCalendar = {
      credentialId: 100,
      externalId: "externalId",
      integration: "office365_calendar",
      userId: 200,
    };
    const result = await getCalendarsEvents(
      [
        {
          ...credential,
          type: "google_calendar",
        },
        {
          ...credential,
          type: "office365_calendar",
          key: {
            access_token: "access",
            refresh_token: "refresh",
            expires_in: Date.now() + 86400,
          },
        },
      ],
      "2010-12-01",
      "2010-12-04",
      [selectedGoogleCalendar, selectedOfficeCalendar]
    );

    expect(getGoogleAvailabilitySpy).toHaveBeenCalledWith("2010-12-01", "2010-12-04", [
      selectedGoogleCalendar,
    ]);
    expect(getOfficeAvailabilitySpy).toHaveBeenCalledWith("2010-12-01", "2010-12-04", [
      selectedOfficeCalendar,
    ]);
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
});
