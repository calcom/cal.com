/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Credential } from "@prisma/client";
import { handleErrorsJson, O365AuthCredentials } from "./videoClient";
import prisma from "@lib/prisma";
import { CalendarEvent } from "@lib/calendarClient";
import CalEventParser from "@lib/CalEventParser";
import { EventResult } from "./EventManager";

const MS_GRAPH_CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID || "";
const MS_GRAPH_CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET || "";

export type NewCalendarEventType = {
  uid: string;
  id: string;
  type: string;
  password: string;
  url: string;
  additionalInfo: Record<string, unknown>;
};

export type IntegrationCalendar = {
  externalId: string;
  integration: string;
  name: string;
  primary: boolean;
};

export interface BufferedBusyTime {
  start: string;
  end: string;
}

const o365Auth = (credential: Credential) => {
  const isExpired = (expiryDate: number) => expiryDate < Math.round(+new Date());

  let key = credential.key as any;
  if (typeof key === "string") {
    key = JSON.parse(key);
  }

  const o365AuthCredentials = key as unknown as O365AuthCredentials;

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
              key: JSON.stringify(o365AuthCredentials),
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

const getLocation = (calEvent: CalendarEvent) => {
  let providerName = "";

  if (calEvent.location && calEvent.location.includes("integrations:")) {
    const location = calEvent.location.split(":")[1];
    providerName = location[0].toUpperCase() + location.slice(1);
  }

  if (calEvent.videoCallData) {
    return calEvent.videoCallData.url;
  }

  return providerName || calEvent.location || "";
};

const translateEvent = (event: CalendarEvent) => {
  const userAttendant = event.attendees[1];
  return {
    subject: `${event.title} - ${userAttendant.name}`,
    body: {
      contentType: "HTML",
      content: "",
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

const createUrlEvent = async (
  credential: Credential,
  event: CalendarEvent
): Promise<NewCalendarEventType> => {
  try {
    const auth = o365Auth(credential);
    const accessToken = await auth.getToken();

    // const calendarId = event.destinationCalendar?.externalId
    //   ? `${event.destinationCalendar.externalId}/`
    //   : "";

    const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendar/events`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(translateEvent(event)),
    });

    return handleErrorsJson(response);
  } catch (error) {
    console.error(error);

    throw error;
  }
};

const createEvent = async (credential: Credential, calEvent: CalendarEvent): Promise<EventResult> => {
  const parser: CalEventParser = new CalEventParser(calEvent);
  const uid: string = parser.getUid();
  let success = true;

  // TODO: Surfice success/error messages coming from apps to improve end user visibility
  const creationResult =
    (await createUrlEvent(credential, calEvent).catch((e) => {
      console.log("createEvent failed", e, calEvent);
      success = false;
      return undefined;
    })) || undefined;

  return {
    type: credential.type,
    success,
    uid,
    createdEvent: creationResult,
    originalEvent: calEvent,
  };
};

const listCalendars = async (credential: Credential): Promise<IntegrationCalendar[]> => {
  const auth = o365Auth(credential);
  return auth.getToken().then((accessToken) =>
    fetch("https://graph.microsoft.com/v1.0/me/calendars", {
      method: "get",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
    })
      .then(handleErrorsJson)
      .then((responseBody: { value: any }) => {
        return responseBody.value.map((cal) => {
          const calendar: IntegrationCalendar = {
            externalId: cal.id ?? "No Id",
            integration: "office365_calendar",
            name: cal.name ?? "No calendar name",
            primary: cal.isDefaultCalendar ?? false,
          };
          return calendar;
        });
      })
  );
};

const getAvailabilityOutlookCalendar = async (
  dateFrom: string,
  dateTo: string,
  selectedCalendars: IntegrationCalendar[],
  credential: Credential,
  bookingReference: string[]
): Promise<any> => {
  const dateFromParsed = new Date(dateFrom);
  const dateToParsed = new Date(dateTo);

  const filter = `?startdatetime=${encodeURIComponent(
    dateFromParsed.toISOString()
  )}&enddatetime=${encodeURIComponent(dateToParsed.toISOString())}`;

  return o365Auth(credential)
    .getToken()
    .then((accessToken) => {
      if (selectedCalendars.length === 0) {
        return Promise.resolve([]);
      }

      const ids = selectedCalendars.map((e) => e.externalId).filter(Boolean) || [];

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
        .then((responseBody: any) => {
          return responseBody.responses.reduce((acc: BufferedBusyTime[], subResponse) => {
            return acc.concat(
              subResponse.body.value.map((evt) => {
                if (!bookingReference.includes(evt.id)) {
                  return {
                    start: evt.start.dateTime + "Z",
                    end: evt.end.dateTime + "Z",
                    subject: evt.subject,
                    name: evt.organizer.emailAddress?.name,
                    calenderType: "outlook",
                  };
                }
              })
            );
          }, []);
        });
    });
};

export { createEvent, getLocation, listCalendars, getAvailabilityOutlookCalendar };
