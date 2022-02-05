import { Credential } from "@prisma/client";

import { handleErrorsJson, handleErrorsRaw } from "@lib/errors";
import { PartialReference } from "@lib/events/EventManager";
import prisma from "@lib/prisma";
import { VideoApiAdapter, VideoCallData } from "@lib/videoClient";

import { CalendarEvent } from "../calendar/interfaces/Calendar";

interface TandemToken {
  expires_in?: number;
  expiry_date: number;
  refresh_token: string;
  token_type: "Bearer";
  access_token: string;
}

const client_id = process.env.TANDEM_CLIENT_ID as string;
const client_secret = process.env.TANDEM_CLIENT_SECRET as string;
const TANDEM_BASE_URL = process.env.TANDEM_BASE_URL as string;

const tandemAuth = (credential: Credential) => {
  const credentialKey = credential.key as unknown as TandemToken;
  const isTokenValid = (token: TandemToken) => token && token.access_token && token.expiry_date < Date.now();

  const refreshAccessToken = (refreshToken: string) => {
    fetch(`${TANDEM_BASE_URL}/api/v1/oauth/v2/token`, {
      method: "POST",
      body: new URLSearchParams({
        client_id,
        client_secret,
        code: refreshToken,
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
        credentialKey.expiry_date = responseBody.expiry_date;
        credentialKey.access_token = responseBody.access_token;
        credentialKey.refresh_token = responseBody.refresh_token;
        return credentialKey.access_token;
      });
  };

  return {
    getToken: () =>
      !isTokenValid(credentialKey)
        ? Promise.resolve(credentialKey.access_token)
        : refreshAccessToken(credentialKey.refresh_token),
  };
};

const TandemVideoApiAdapter = (credential: Credential): VideoApiAdapter => {
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

  const _translateResult = (result: { data: { id: string; event_link: string } }) => {
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
      const accessToken = await auth.getToken();

      const result = await fetch(`${TANDEM_BASE_URL}/api/v1/meetings`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
        body: _translateEvent(event, "meeting"),
      }).then(handleErrorsJson);

      return Promise.resolve(_translateResult(result));
    },

    deleteMeeting: async (uid: string): Promise<void> => {
      const accessToken = await auth.getToken();

      await fetch(`${TANDEM_BASE_URL}/api/v1/meetings/${uid}`, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + accessToken,
        },
      }).then(handleErrorsRaw);

      return Promise.resolve();
    },

    updateMeeting: async (bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> => {
      const accessToken = await auth.getToken();

      const result = await fetch(`${TANDEM_BASE_URL}/api/v1/meetings/${bookingRef.meetingId}`, {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
        body: _translateEvent(event, "updates"),
      }).then(handleErrorsJson);

      return Promise.resolve(_translateResult(result));
    },
  };
};

export default TandemVideoApiAdapter;
