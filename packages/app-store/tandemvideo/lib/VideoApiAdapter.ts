import type { Prisma } from "@prisma/client";

import { handleErrorsJson, handleErrorsRaw } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

interface TandemToken {
  expires_in?: number;
  expiry_date: number;
  refresh_token: string;
  token_type: "Bearer";
  access_token: string;
}

interface ITandemRefreshToken {
  expires_in?: number;
  expiry_date?: number;
  access_token: string;
  refresh_token: string;
}

interface ITandemCreateMeetingResponse {
  data: {
    id: string;
    event_link: string;
  };
}

let client_id = "";
let client_secret = "";
let base_url = "";

const tandemAuth = async (credential: CredentialPayload) => {
  const appKeys = await getAppKeysFromSlug("tandem");
  if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
  if (typeof appKeys.client_secret === "string") client_secret = appKeys.client_secret;
  if (typeof appKeys.base_url === "string") base_url = appKeys.base_url;
  if (!client_id) throw new HttpError({ statusCode: 400, message: "Tandem client_id missing." });
  if (!client_secret) throw new HttpError({ statusCode: 400, message: "Tandem client_secret missing." });
  if (!base_url) throw new HttpError({ statusCode: 400, message: "Tandem base_url missing." });

  const credentialKey = credential.key as unknown as TandemToken;
  const isTokenValid = (token: TandemToken) => token && token.access_token && token.expiry_date < Date.now();

  const refreshAccessToken = async (refreshToken: string) => {
    const result = await fetch(`${base_url}/api/v1/oauth/v2/token`, {
      method: "POST",
      body: new URLSearchParams({
        client_id,
        client_secret,
        code: refreshToken,
      }),
    });
    const responseBody = await handleErrorsJson<ITandemRefreshToken>(result);

    // set expiry date as offset from current time.
    responseBody.expiry_date = Math.round(Date.now() + (responseBody.expires_in || 0) * 1000);
    delete responseBody.expires_in;
    // Store new tokens in database.
    await prisma.credential.update({
      where: {
        id: credential.id,
      },
      data: {
        key: responseBody as unknown as Prisma.InputJsonValue,
      },
    });
    credentialKey.expiry_date = responseBody.expiry_date;
    credentialKey.access_token = responseBody.access_token;
    credentialKey.refresh_token = responseBody.refresh_token;
    return credentialKey.access_token;
  };

  return {
    getToken: () =>
      !isTokenValid(credentialKey)
        ? Promise.resolve(credentialKey.access_token)
        : refreshAccessToken(credentialKey.refresh_token),
  };
};

const TandemVideoApiAdapter = (credential: CredentialPayload): VideoApiAdapter => {
  const auth = tandemAuth(credential);

  const _parseDate = (date: string) => {
    return Date.parse(date) / 1000;
  };

  const _translateEvent = (event: CalendarEvent, param: string): string => {
    return JSON.stringify({
      [param]: {
        title: event.title,
        starts_at: _parseDate(event.startTime),
        ends_at: _parseDate(event.endTime),
        description: event.description || "",
        conference_solution: "tandem",
        type: 3,
      },
    });
  };

  const _translateResult = (result: ITandemCreateMeetingResponse) => {
    return {
      type: "tandem_video",
      id: result.data.id as string,
      password: "",
      url: result.data.event_link,
    };
  };

  return {
    /** Tandem doesn't need to return busy times, so we return empty */
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      const accessToken = await (await auth).getToken();

      const result = await fetch(`${base_url}/api/v1/meetings`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
        body: _translateEvent(event, "meeting"),
      });
      const responseBody = await handleErrorsJson<ITandemCreateMeetingResponse>(result);

      return Promise.resolve(_translateResult(responseBody));
    },

    deleteMeeting: async (uid: string): Promise<void> => {
      const accessToken = await (await auth).getToken();

      await fetch(`${base_url}/api/v1/meetings/${uid}`, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + accessToken,
        },
      }).then(handleErrorsRaw);

      return Promise.resolve();
    },

    updateMeeting: async (bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> => {
      const accessToken = await (await auth).getToken();

      const result = await fetch(`${base_url}/api/v1/meetings/${bookingRef.meetingId}`, {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
        body: _translateEvent(event, "updates"),
      });
      const responseBody = await handleErrorsJson<ITandemCreateMeetingResponse>(result);

      return Promise.resolve(_translateResult(responseBody));
    },
  };
};

export default TandemVideoApiAdapter;
