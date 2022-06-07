import { Calendar as OfficeCalendar } from "@microsoft/microsoft-graph-types-beta";
import { Credential } from "@prisma/client";

import { getLocation, getRichDescription } from "@calcom/lib/CalEventParser";
import { handleErrorsJson, handleErrorsRaw } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { BufferedBusyTime } from "@calcom/types/BufferedBusyTime";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { O365AuthCredentials } from "../types/Office365Calendar";

let client_id = "";
let client_secret = "";

export default class Office365CalendarService implements Calendar {
  private url = "";
  private integrationName = "";
  private log: typeof logger;
  auth: Promise<{ getToken: () => Promise<string> }>;

  constructor(credential: Credential) {
    this.integrationName = "office365_calendar";
    this.auth = this.o365Auth(credential).then((t) => t);

    this.log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });
  }

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    try {
      const accessToken = await (await this.auth).getToken();

      const calendarId = event.destinationCalendar?.externalId
        ? `${event.destinationCalendar.externalId}/`
        : "";

      const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendar/events`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.translateEvent(event)),
      });

      return handleErrorsJson(response);
    } catch (error) {
      this.log.error(error);

      throw error;
    }
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<any> {
    try {
      const accessToken = await (await this.auth).getToken();

      const response = await fetch("https://graph.microsoft.com/v1.0/me/calendar/events/" + uid, {
        method: "PATCH",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.translateEvent(event)),
      });

      return handleErrorsRaw(response);
    } catch (error) {
      this.log.error(error);

      throw error;
    }
  }

  async deleteEvent(uid: string): Promise<void> {
    try {
      const accessToken = await (await this.auth).getToken();

      const response = await fetch("https://graph.microsoft.com/v1.0/me/calendar/events/" + uid, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + accessToken,
        },
      });

      handleErrorsRaw(response);
    } catch (error) {
      this.log.error(error);

      throw error;
    }
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    const dateFromParsed = new Date(dateFrom);
    const dateToParsed = new Date(dateTo);

    const filter = `?startDateTime=${encodeURIComponent(
      dateFromParsed.toISOString()
    )}&endDateTime=${encodeURIComponent(dateToParsed.toISOString())}`;
    return (await this.auth)
      .getToken()
      .then(async (accessToken) => {
        const selectedCalendarIds = selectedCalendars
          .filter((e) => e.integration === this.integrationName)
          .map((e) => e.externalId)
          .filter(Boolean);
        if (selectedCalendarIds.length === 0 && selectedCalendars.length > 0) {
          // Only calendars of other integrations selected
          return Promise.resolve([]);
        }

        const ids = await (selectedCalendarIds.length === 0
          ? this.listCalendars().then((cals) => cals.map((e_2) => e_2.externalId).filter(Boolean) || [])
          : Promise.resolve(selectedCalendarIds));
        const requests = ids.map((calendarId, id) => ({
          id,
          method: "GET",
          url: `/me/calendars/${calendarId}/calendarView${filter}`,
        }));
        const response = await fetch("https://graph.microsoft.com/v1.0/$batch", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ requests }),
        });
        const responseBody = await handleErrorsJson(response);
        return responseBody.responses.reduce(
          (acc: BufferedBusyTime[], subResponse: { body: { value: any[] } }) =>
            acc.concat(
              subResponse.body.value
                .filter((evt) => evt.showAs !== "free" && evt.showAs !== "workingElsewhere")
                .map((evt) => {
                  return {
                    start: evt.start.dateTime + "Z",
                    end: evt.end.dateTime + "Z",
                  };
                })
            ),
          []
        );
      })
      .catch((err: unknown) => {
        console.log(err);
        return Promise.reject([]);
      });
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    return (await this.auth).getToken().then((accessToken) =>
      fetch("https://graph.microsoft.com/v1.0/me/calendars", {
        method: "get",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
      })
        .then(handleErrorsJson)
        .then((responseBody: { value: OfficeCalendar[] }) => {
          return responseBody.value.map((cal) => {
            const calendar: IntegrationCalendar = {
              externalId: cal.id ?? "No Id",
              integration: this.integrationName,
              name: cal.name ?? "No calendar name",
              primary: cal.isDefaultCalendar ?? false,
            };
            return calendar;
          });
        })
    );
  }

  private o365Auth = async (credential: Credential) => {
    const appKeys = await getAppKeysFromSlug("office365-calendar");
    if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
    if (typeof appKeys.client_secret === "string") client_secret = appKeys.client_secret;
    if (!client_id) throw new HttpError({ statusCode: 400, message: "office365 client_id missing." });
    if (!client_secret) throw new HttpError({ statusCode: 400, message: "office365 client_secret missing." });

    const isExpired = (expiryDate: number) => expiryDate < Math.round(+new Date() / 1000);

    const o365AuthCredentials = credential.key as O365AuthCredentials;

    const refreshAccessToken = async (refreshToken: string) => {
      const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          scope: "User.Read Calendars.Read Calendars.ReadWrite",
          client_id,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
          client_secret,
        }),
      });
      const responseBody = await handleErrorsJson(response);
      o365AuthCredentials.access_token = responseBody.access_token;
      o365AuthCredentials.expiry_date = Math.round(+new Date() / 1000 + responseBody.expires_in);
      await prisma.credential.update({
        where: {
          id: credential.id,
        },
        data: {
          key: o365AuthCredentials,
        },
      });
      return o365AuthCredentials.access_token;
    };

    return {
      getToken: () =>
        !isExpired(o365AuthCredentials.expiry_date)
          ? Promise.resolve(o365AuthCredentials.access_token)
          : refreshAccessToken(o365AuthCredentials.refresh_token),
    };
  };

  private translateEvent = (event: CalendarEvent) => {
    return {
      subject: event.title,
      body: {
        contentType: "HTML",
        content: getRichDescription(event),
      },
      start: {
        dateTime: event.startTime,
        timeZone: event.organizer.timeZone,
      },
      end: {
        dateTime: event.endTime,
        timeZone: event.organizer.timeZone,
      },
      attendees: event.attendees.map((attendee) => ({
        emailAddress: {
          address: attendee.email,
          name: attendee.name,
        },
        type: "required",
      })),
      location: event.location ? { displayName: getLocation(event) } : undefined,
    };
  };
}
