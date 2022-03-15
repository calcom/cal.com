import { Credential } from "@prisma/client";

import { handleErrorsJson, handleErrorsRaw } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

const MS_GRAPH_CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID || "";
const MS_GRAPH_CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET || "";

/** @link https://docs.microsoft.com/en-us/graph/api/application-post-onlinemeetings?view=graph-rest-1.0&tabs=http#response */
export interface TeamsEventResult {
  creationDateTime: string;
  startDateTime: string;
  endDateTime: string;
  id: string;
  joinWebUrl: string;
  subject: string;
}

interface O365AuthCredentials {
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
      .then(async (responseBody) => {
        // set expiry date as offset from current time.
        responseBody.expiry_date = Math.round(Date.now() + responseBody.expires_in * 1000);
        delete responseBody.expires_in;
        // Store new tokens in database.
        await prisma.credential.update({
          where: {
            id: credential.id,
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

const TeamsVideoApiAdapter = (credential: Credential): VideoApiAdapter => {
  const auth = o365Auth(credential);

  const translateEvent = (event: CalendarEvent) => {
    return {
      startDateTime: event.startTime,
      endDateTime: event.endTime,
      subject: event.title,
    };
  };

  // Since the meeting link is not tied to an event we only need the create and update functions
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    updateMeeting: async (bookingRef: PartialReference, event: CalendarEvent) => {
      const accessToken = await auth.getToken();

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
    },
    deleteMeeting: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      const accessToken = await auth.getToken();

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
    },
  };
};

export default TeamsVideoApiAdapter;
