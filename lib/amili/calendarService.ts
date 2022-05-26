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

const o365Auth = (credential: Credential) => {
  const isExpired = (expiryDate: number) => expiryDate < Math.round(+new Date() / 1000);

  const o365AuthCredentials = credential.key as unknown as O365AuthCredentials;

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
  return {
    subject: event.title,
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

export { createEvent };
