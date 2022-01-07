import { Calendar as OfficeCalendar } from "@microsoft/microsoft-graph-types-beta";
import { Credential } from "@prisma/client";

import { getLocation, getRichDescription } from "@lib/CalEventParser";
import { handleErrorsJson, handleErrorsRaw } from "@lib/errors";
import { CALENDAR_INTEGRATIONS_TYPES } from "@lib/integrations/calendar/constants/generals";
import logger from "@lib/logger";
import prisma from "@lib/prisma";

import { BatchResponse, EventBusyDate, NewCalendarEventType } from "../constants/types";
import { Calendar, CalendarEvent, IntegrationCalendar } from "../interfaces/Calendar";
import { BufferedBusyTime, O365AuthCredentials } from "../interfaces/Office365Calendar";

const MS_GRAPH_CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID || "";
const MS_GRAPH_CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET || "";

export default class Office365CalendarService implements Calendar {
  private url = "";
  private integrationName = "";
  private log: typeof logger;
  auth: { getToken: () => Promise<string> };

  constructor(credential: Credential) {
    this.integrationName = CALENDAR_INTEGRATIONS_TYPES.office365;
    this.auth = this.o365Auth(credential);

    this.log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });
  }

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    try {
      const accessToken = await this.auth.getToken();

      const calendarId = event.destinationCalendar?.externalId
        ? `${event.destinationCalendar.externalId}/`
        : "";

      const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendar/${calendarId}events`, {
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
      const accessToken = await this.auth.getToken();

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
      const accessToken = await this.auth.getToken();

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

    const filter = `?startdatetime=${encodeURIComponent(
      dateFromParsed.toISOString()
    )}&enddatetime=${encodeURIComponent(dateToParsed.toISOString())}`;
    return this.auth
      .getToken()
      .then((accessToken) => {
        const selectedCalendarIds = selectedCalendars
          .filter((e) => e.integration === this.integrationName)
          .map((e) => e.externalId)
          .filter(Boolean);
        if (selectedCalendarIds.length === 0 && selectedCalendars.length > 0) {
          // Only calendars of other integrations selected
          return Promise.resolve([]);
        }

        return (
          selectedCalendarIds.length === 0
            ? this.listCalendars().then((cals) => cals.map((e) => e.externalId).filter(Boolean) || [])
            : Promise.resolve(selectedCalendarIds)
        ).then((ids) => {
          const requests = ids.map((calendarId, id) => ({
            id,
            method: "GET",
            url: `/me/calendars/${calendarId}/calendarView${filter}`,
          }));

          return fetch("https://graph.microsoft.com/v1.0/$batch", {
            method: "POST",
            headers: {
              Authorization: "Bearer " + accessToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ requests }),
          })
            .then(handleErrorsJson)
            .then((responseBody: BatchResponse) =>
              responseBody.responses.reduce(
                (acc: BufferedBusyTime[], subResponse) =>
                  acc.concat(
                    subResponse.body.value.map((evt) => {
                      return {
                        start: evt.start.dateTime + "Z",
                        end: evt.end.dateTime + "Z",
                      };
                    })
                  ),
                []
              )
            );
        });
      })
      .catch((err) => {
        console.log(err);
        return Promise.reject([]);
      });
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    return this.auth.getToken().then((accessToken) =>
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

  private o365Auth = (credential: Credential) => {
    const isExpired = (expiryDate: number) => expiryDate < Math.round(+new Date() / 1000);

    const o365AuthCredentials = credential.key as O365AuthCredentials;

    const refreshAccessToken = (refreshToken: string) => {
      return fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          scope: "User.Read Calendars.Read Calendars.ReadWrite",
          client_id: MS_GRAPH_CLIENT_ID,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
          client_secret: MS_GRAPH_CLIENT_SECRET,
        }),
      })
        .then(handleErrorsJson)
        .then((responseBody) => {
          o365AuthCredentials.access_token = responseBody.access_token;
          o365AuthCredentials.expiry_date = Math.round(+new Date() / 1000 + responseBody.expires_in);
          return prisma.credential
            .update({
              where: {
                id: credential.id,
              },
              data: {
                key: o365AuthCredentials,
              },
            })
            .then(() => o365AuthCredentials.access_token);
        });
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
