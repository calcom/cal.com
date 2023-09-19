import type { Prisma } from "@prisma/client";

import { handleErrorsJson, handleErrorsRaw } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

let client_id = "";
let client_secret = "";

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

interface ITokenResponse {
  expiry_date: number;
  expires_in?: number;
  token_type: string;
  scope: string;
  access_token: string;
  refresh_token: string;
  error?: string;
  error_description?: string;
}

// Checks to see if our O365 user token is valid or if we need to refresh
const o365Auth = async (credential: CredentialPayload) => {
  const appKeys = await getAppKeysFromSlug("msteams");
  if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
  if (typeof appKeys.client_secret === "string") client_secret = appKeys.client_secret;
  if (!client_id) throw new HttpError({ statusCode: 400, message: "MS teams client_id missing." });
  if (!client_secret) throw new HttpError({ statusCode: 400, message: "MS teams client_secret missing." });

  const isExpired = (expiryDate: number) => expiryDate < Math.round(+new Date());

  const o365AuthCredentials = credential.key as unknown as O365AuthCredentials;

  const refreshAccessToken = async (refreshToken: string) => {
    const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        client_secret,
      }),
    });

    const responseBody = await handleErrorsJson<ITokenResponse>(response);

    if (responseBody?.error) {
      console.error(responseBody);
      throw new HttpError({ statusCode: 500, message: `Error contacting MS Teams: ${responseBody.error}` });
    }
    // set expiry date as offset from current time.
    responseBody.expiry_date = Math.round(Date.now() + (responseBody?.expires_in || 0) * 1000);
    delete responseBody.expires_in;
    // Store new tokens in database.
    await prisma.credential.update({
      where: {
        id: credential.id,
      },
      data: {
        // @NOTE: prisma doesn't know key its a JSON so do as responseBody
        key: responseBody as unknown as Prisma.InputJsonValue,
      },
    });
    o365AuthCredentials.expiry_date = responseBody.expiry_date;
    o365AuthCredentials.access_token = responseBody.access_token;
    return o365AuthCredentials.access_token;
  };

  return {
    getToken: () =>
      isExpired(o365AuthCredentials.expiry_date)
        ? refreshAccessToken(o365AuthCredentials.refresh_token)
        : Promise.resolve(o365AuthCredentials.access_token),
  };
};

const TeamsVideoApiAdapter = (credential: CredentialPayload): VideoApiAdapter => {
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
      const accessToken = await (await auth).getToken();

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
      const accessToken = await (await auth).getToken();

      const resultString = await fetch("https://graph.microsoft.com/v1.0/me/onlineMeetings", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(translateEvent(event)),
      }).then(handleErrorsRaw);

      const resultObject = JSON.parse(resultString);

      if (!resultObject.id || !resultObject.joinUrl || !resultObject.joinWebUrl) {
        throw new HttpError({
          statusCode: 500,
          message: `Error creating MS Teams meeting: ${resultObject.error.message}`,
        });
      }

      return Promise.resolve({
        type: "office365_video",
        id: resultObject.id,
        password: "",
        url: resultObject.joinWebUrl || resultObject.joinUrl,
      });
    },
  };
};

export default TeamsVideoApiAdapter;
