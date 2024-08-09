import refreshOAuthTokens from "_utils/oauth/refreshOAuthTokens";
import { z } from "zod";

import prisma from "@calcom/prisma";
import type { EventBusyDate } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import { getDialpadAppKeys } from "../lib/getDialpadAppKeys";

const dialpadRefreshedTokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  id_token: z.string(),
  refresh_token: z.string(),
  token_type: z.literal("bearer"),
});
const dialpadTokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number().optional(),
  id_token: z.string(),
  refresh_token: z.string(),
  token_type: z.literal("bearer"),
  expiry_date: z.number(),
});
type DialpadToken = z.infer<typeof dialpadTokenSchema>;
const isTokenValid = (token: DialpadToken) => token.expiry_date < Date.now();

const dialpadAuth = (credential: CredentialPayload) => {
  const refreshAccessToken = async (refreshToken: string) => {
    const { client_id, client_secret } = await getDialpadAppKeys();

    const response = await refreshOAuthTokens(
      async () =>
        await fetch("https://dialpad.com/oauth2/token", {
          method: "POST",
          headers: {
            "Content-type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: client_id,
            client_secret: client_secret,
            refresh_token: refreshToken,
          }),
        }),
      "dialpad",
      credential.userId
    );

    if (response.status !== 200) {
      let errorMessage = "Something is wrong with Dialpad API";
      try {
        const responseBody = await response.json();
        errorMessage = responseBody.error;
      } catch (e) {}
      return Promise.reject(new Error(errorMessage));
    }

    const responseBody = await response.json();

    if (responseBody.error) {
      return Promise.reject(new Error(responseBody.error));
    }
    // We check the if the new credentials matches the expected response structure
    const parsedToken = dialpadRefreshedTokenSchema.safeParse(responseBody);
    if (!parsedToken.success) {
      return Promise.reject(new Error("Invalid refreshed tokens were returned"));
    }
    const newTokens = parsedToken.data;
    const oldCredential = await prisma.credential.findUniqueOrThrow({ where: { id: credential.id } });
    const parsedKey = dialpadTokenSchema.safeParse(oldCredential.key);
    if (!parsedKey.success) {
      return Promise.reject(new Error("Invalid credentials were saved in the DB"));
    }

    const key = parsedKey.data;
    key.access_token = newTokens.access_token;
    key.refresh_token = newTokens.refresh_token;
    // set expiry date as offset from current time.
    if (newTokens.expires_in) {
      key.expiry_date = Math.round(Date.now() + newTokens.expires_in * 1000);
    }
    // Store new tokens in database.
    await prisma.credential.update({ where: { id: credential.id }, data: { key } });
    return newTokens.access_token;
  };
  return {
    getToken: async () => {
      let credentialKey: DialpadToken | null = null;
      try {
        credentialKey = dialpadTokenSchema.parse(credential.key);
      } catch (error) {
        return Promise.reject("Dialpad credential keys parsing error");
      }

      return !isTokenValid(credentialKey)
        ? Promise.resolve(credentialKey.access_token)
        : refreshAccessToken(credentialKey.refresh_token);
    },
  };
};
const DialpadVideoApiAdapter = async (credential: CredentialPayload): Promise<VideoApiAdapter> => {
  return {
    createMeeting: async (): Promise<VideoCallData> => {
      const auth = dialpadAuth(credential);
      const accessToken = await auth.getToken();
      const dialpadLink = await fetch("https://dialpad.com/api/v2/conference/rooms", {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const dialpadLinkData = await dialpadLink.json();

      return {
        type: "dialpad_conferencing",
        id: dialpadLinkData.items[0].id as string,
        password: "",
        url: dialpadLinkData.items[0].path as string,
      };
    },
    updateMeeting: async (bookingRef: PartialReference): Promise<VideoCallData> => {
      return {
        type: "dialpad_conferencing",
        id: bookingRef.meetingId as string,
        password: bookingRef.meetingPassword as string,
        url: bookingRef.meetingUrl as string,
      };
    },
    deleteMeeting: async (): Promise<void> => {
      Promise.resolve();
    },
    getAvailability: async (): Promise<EventBusyDate[]> => {
      return [];
    },
  };
};

export default DialpadVideoApiAdapter;
