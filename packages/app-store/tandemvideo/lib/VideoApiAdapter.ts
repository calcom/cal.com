import { handleErrorsJson, handleErrorsRaw } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
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

const loadConfiguration = async () => {
  const appKeys = await getAppKeysFromSlug("tandem");
  let clientId = "";
  let clientSecret = "";
  let baseUrl = "";
  if (typeof appKeys.client_id === "string") clientId = appKeys.client_id;
  if (typeof appKeys.client_secret === "string") clientSecret = appKeys.client_secret;
  if (typeof appKeys.base_url === "string") baseUrl = appKeys.base_url;
  if (!clientId) throw new HttpError({ statusCode: 400, message: "Tandem client_id missing." });
  if (!clientSecret) throw new HttpError({ statusCode: 400, message: "Tandem client_secret missing." });
  if (!baseUrl) throw new HttpError({ statusCode: 400, message: "Tandem base_url missing." });

  return {
    clientId,
    clientSecret,
    baseUrl,
  };
};

const tandemAuth = async (credential: CredentialPayload) => {
  const configuration = await loadConfiguration();
  const credentialKey = credential.key as unknown as TandemToken;
  const isTokenValid = (token: TandemToken) => token && token.access_token && token.expiry_date < Date.now();

  const refreshAccessToken = async (refreshToken: string) => {
    const result = await fetch(`${configuration.baseUrl}/api/v1/oauth/v2/token`, {
      method: "POST",
      body: new URLSearchParams({
        client_id: configuration.clientId,
        client_secret: configuration.clientSecret,
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
      const configuration = await loadConfiguration();

      const result = await fetch(`${configuration.baseUrl}/api/v1/meetings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: _translateEvent(event, "meeting"),
      });
      const responseBody = await handleErrorsJson<ITandemCreateMeetingResponse>(result);

      return Promise.resolve(_translateResult(responseBody));
    },

    deleteMeeting: async (uid: string): Promise<void> => {
      const accessToken = await (await auth).getToken();
      const configuration = await loadConfiguration();

      await fetch(`${configuration.baseUrl}/api/v1/meetings/${uid}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).then(handleErrorsRaw);

      return Promise.resolve();
    },

    updateMeeting: async (bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> => {
      const accessToken = await (await auth).getToken();
      const configuration = await loadConfiguration();

      const result = await fetch(`${configuration.baseUrl}/api/v1/meetings/${bookingRef.meetingId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
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
