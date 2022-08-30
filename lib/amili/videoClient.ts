/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CalendarEvent } from "@lib/calendarClient";
import CalEventParser from "@lib/CalEventParser";
import prisma from "@lib/prisma";
import { Credential } from "@prisma/client";

const MS_GRAPH_CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID || "";
const MS_GRAPH_CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET || "";

function handleErrorsJson(response: Response) {
  if (!response.ok) {
    response.json().then(console.log);
    throw Error(response.statusText);
  }
  return response.json();
}

function handleErrorsRaw(response: Response) {
  if (!response.ok) {
    response.text().then(console.log);
    throw Error(response.statusText);
  }
  return response.text();
}

export interface O365AuthCredentials {
  email: string;
  scope: string;
  token_type: string;
  expiry_date: number;
  access_token: string;
  refresh_token: string;
  ext_expires_in: number;
}

// Checks to see if our O365 user token is valid or if we need to refresh
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
      .then(async (responseBody) => {
        // set expiry date as offset from current time.
        responseBody.expiry_date = Math.round(Date.now() + responseBody.expires_in * 1000);
        delete responseBody.expires_in;
        // Store new tokens in database.
        await prisma.credential.update({
          where: {
            id: +credential.id,
          },
          data: {
            key: responseBody,
          },
        });
        o365AuthCredentials.expiry_date = responseBody.expiry_date;
        o365AuthCredentials.access_token = responseBody.access_token;
        return o365AuthCredentials.access_token;
      });
  };

  return {
    getToken: () =>
      !isExpired(o365AuthCredentials.expiry_date)
        ? Promise.resolve(o365AuthCredentials.access_token)
        : refreshAccessToken(o365AuthCredentials.refresh_token),
  };
};

const createUrlMeeting = async (credential: Credential, event: CalendarEvent): Promise<any> => {
  const auth = o365Auth(credential);
  const accessToken = await auth.getToken();

  const translateEvent = (event: CalendarEvent) => {
    return {
      startDateTime: event.startTime,
      endDateTime: event.endTime,
      subject: event.title,
    };
  };

  const resultString = await fetch("https://graph.microsoft.com/v1.0/me/onlineMeetings", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(translateEvent(event)),
  }).then(handleErrorsRaw);

  const resultObject = JSON.parse(resultString);

  return Promise.resolve({
    type: "office365_video",
    id: resultObject.id,
    password: "",
    url: resultObject.joinUrl,
  });
};

const deleteMeetingMSTeam = () => {
  return Promise.resolve([]);
};

const createMeeting = async (credential: Credential, calEvent: CalendarEvent): Promise<any> => {
  const parser: CalEventParser = new CalEventParser(calEvent);
  const uid: string = parser.getUid();

  if (!credential) {
    throw new Error(
      "Credentials must be set! Video platforms are optional, so this method shouldn't even be called when no video credentials are set."
    );
  }

  const createdMeeting = await createUrlMeeting(credential, calEvent).catch((e) => {
    console.error("createMeeting failed", e, calEvent);
  });

  if (!createdMeeting) {
    return {
      type: credential.type,
      success: false,
      uid,
      originalEvent: calEvent,
    };
  }

  return {
    type: credential.type,
    success: true,
    uid,
    createdEvent: createdMeeting,
    originalEvent: calEvent,
  };
};

export { createMeeting, handleErrorsJson, handleErrorsRaw, deleteMeetingMSTeam, o365Auth, createUrlMeeting };
