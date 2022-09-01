/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Credential } from "@prisma/client";
import { handleErrorsJson, O365AuthCredentials } from "./videoClient";
import prisma from "@lib/prisma";
import { CalendarEvent } from "@lib/calendarClient";
import CalEventParser from "@lib/CalEventParser";
import { EventResult } from "./EventManager";
import moment from "moment-timezone";

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

const translateEventMS = (event: CalendarEvent) => {
  const userAttendant = event.attendees[1];

  return {
    subject: `${event.title} - ${userAttendant.name}`,
    body: {
      contentType: "HTML",
      content: "",
    },
    start: {
      dateTime: moment(event.startTime).tz(event.organizer.timeZone).format("YYYY-MM-DDTHH:mm:ss.sss"),
      timeZone: event.organizer.timeZone,
    },
    end: {
      dateTime: moment(event.endTime).tz(event.organizer.timeZone).format("YYYY-MM-DDTHH:mm:ss.sss"),
      timeZone: event.organizer.timeZone,
    },
    attendees: event.attendees.map((attendee) => ({
      emailAddress: {
        address: attendee.email,
        name: attendee.name,
      },
      type: "required",
      status: {
        response: "none",
        time: new Date().toISOString(),
      },
    })),
    // location: event.location
    //   ? { displayName: getLocation(event), locationUri: getLocation(event) }
    //   : undefined,
    responseRequested: false,
    isOnlineMeeting: true,
    onlineMeetingProvider: "teamsForBusiness",
    responseStatus: {
      response: "none",
      time: new Date().toISOString(),
    },
    onlineMeeting: {
      joinUrl: event.location
        ? getLocation(event)
        : event?.videoCallData?.url
        ? event?.videoCallData?.url
        : undefined,
    },
    onlineMeetingUrl: event.location
      ? getLocation(event)
      : event?.videoCallData?.url
      ? event?.videoCallData?.url
      : undefined,
    originalStartTimeZone: event.organizer.timeZone,
    originalEndTimeZone: event.organizer.timeZone,
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

    // console.log("e he", JSON.stringify(translateEventMS(event)));

    const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendar/events`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(translateEventMS(event)),
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

  console.log(JSON.stringify(creationResult));

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

const getCalendars = async (query: string, data: any, accessToken: string, bookingReference: string[]) => {
  let result = data || [];
  let currentQuery = query;
  do {
    const res = await fetch(currentQuery, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
    });

    const responseBody = await handleErrorsJson(res);
    const data = responseBody.value.reduce((acc: BufferedBusyTime[], subResponse) => {
      if (!bookingReference.includes(subResponse.id)) {
        const newStart = subResponse.isAllDay
          ? moment(subResponse.start.dateTime + "Z")
              .hour(0)
              .format("YYYY-MM-DDTHH:mm:ss.sss") + "Z"
          : subResponse.start.dateTime + "Z";
        const newEnd = subResponse.isAllDay
          ? moment(subResponse.start.dateTime + "Z")
              .hour(10)
              .format("YYYY-MM-DDTHH:mm:ss.sss") + "Z"
          : subResponse.end.dateTime + "Z";
        const item = {
          start: newStart,
          end: newEnd,
          subject: subResponse.subject,
          name: subResponse.organizer.emailAddress?.name,
          calenderType: "outlook",
        };
        acc.push(item);
      }
      return acc;
    }, []);
    result = result.concat(data);
    currentQuery = responseBody["@odata.nextLink"];
  } while (currentQuery);
  return result;
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

  const filter = `?startDateTime=${encodeURIComponent(
    dateFromParsed.toISOString()
  )}&endDateTime=${encodeURIComponent(dateToParsed.toISOString())}`;

  const accessToken = await o365Auth(credential).getToken();
  let data = [];
  await Promise.all(
    selectedCalendars.map(async (calendar: IntegrationCalendar) => {
      let result = [];
      result = await getCalendars(
        `https://graph.microsoft.com/v1.0/me/calendars/${calendar.externalId}/calendarView${filter}`,
        result,
        accessToken,
        bookingReference
      );
      data = data.concat(result);
      return result;
    })
  );

  return data || [];
  // let result = [];
  // result = await getCalendars(
  //   `https://graph.microsoft.com/v1.0/me/calendar/calendarView${filter}`,
  //   result,
  //   accessToken,
  //   bookingReference
  // );

  // return result;
};

export { createEvent, getLocation, listCalendars, getAvailabilityOutlookCalendar, translateEventMS };
