import { z } from "zod";

import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { Credential } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import refreshOAuthTokens from "../../_utils/oauth/refreshOAuthTokens";
import { baseUrl, accessTokenUrl } from "../api/add";
import { appKeysSchema as leverKeysSchema } from "../zod";

/** @link https://hire.lever.co/developer/documentation#authentication */
const leverAccessTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.literal("Bearer"),
  scope: z.literal("offline_access opportunities:read:admin contact:read:admin"),
  expires_in: z.number().optional(),
  expiry_date: z.number(),
});
type LeverAccessToken = z.infer<typeof leverAccessTokenSchema>;

/** @link https://hire.lever.co/developer/documentation#authentication */
const leverRefreshedTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.literal("Bearer"),
  scope: z.literal("offline_access opportunities:read:admin contact:read:admin"),
  expires_in: z.number().optional(),
});

/** @link https://hire.lever.co/developer/documentation#retrieve-a-single-user */
export const leverUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string().regex(/^[^@]+/),
  email: z.string().email(),
});

/** @link https://hire.lever.co/developer/documentation#stages */
export const leverStageSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
});

/** @link https://hire.lever.co/developer/documentation#interviews */
export const leverInterviewSchema = z.object({
  id: z.string().uuid(),
  panel: z.string().uuid(),
  subject: z.string().optional(),
  note: z.string().optional(),
  interviewers: z.array(leverUserSchema),
  timezone: z.string().optional(),
  date: z.string().datetime(),
  duration: z.number(),
  location: z.string().optional(),
  user: leverUserSchema.shape.id,
  stage: leverStageSchema.shape.id,
});

export const leverInterviewsSchema = z.array(leverInterviewSchema);

/**
 * getUserTimezoneFromDB() retrieves the timezone of a user from the database.
 *
 * @param {number} id - The user's unique identifier.
 * @returns {Promise<string | undefined>} - A Promise that resolves to the user's timezone or "Europe/London" as a default value if the timezone is not found.
 */
const getUserTimezoneFromDB = async (id: number): Promise<string | undefined> => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      timeZone: true,
    },
  });
  return user?.timeZone;
};

const leverAuth = (credential: CredentialPayload) => {
  const isTokenValid = (token: LeverAccessToken) => token.expiry_date < Date.now();

  const refreshAccessToken = async (refreshToken: string) => {
    const appKeys = await getAppKeysFromSlug("lever");
    const { client_id, client_secret } = leverKeysSchema.parse(appKeys);
    const response = await refreshOAuthTokens(
      async () =>
        await fetch(accessTokenUrl, {
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
      "lever",
      credential.userId
    );

    const responseBody = await handleLeverResponse(response, credential.id);
    if (responseBody.error) {
      if (responseBody.error === "invalid_grant") {
        return Promise.reject(new Error("Invalid grant for Cal.com lever app"));
      }
    }
    // We check the if the new credentials matches the expected response structure
    const parsedToken = leverRefreshedTokenSchema.safeParse(responseBody);
    if (!parsedToken.success) {
      return Promise.reject(new Error("Invalid refreshed tokens were returned"));
    }
    const newTokens = parsedToken.data;
    const oldCredential = await prisma.credential.findUniqueOrThrow({ where: { id: credential.id } });
    const parsedKey = leverAccessTokenSchema.safeParse(oldCredential.key);
    if (!parsedKey.success) {
      return Promise.reject(new Error("Invalid credentials were saved in the DB"));
    }

    const key = parsedKey.data;
    key.access_token = newTokens.access_token;
    key.refresh_token = newTokens.refresh_token;
    // Set expiry date as offset from current time.
    if (newTokens.expires_in) {
      key.expiry_date = Math.round(Date.now() + newTokens.expires_in * 1000);
    }
    // Store new tokens in database.
    await prisma.credential.update({ where: { id: credential.id }, data: { key } });
    return newTokens.access_token;
  };

  return {
    getToken: async () => {
      let credentialKey: LeverAccessToken | null = null;
      try {
        credentialKey = leverAccessTokenSchema.parse(credential.key);
      } catch (error) {
        return Promise.reject("Lever credential keys parsing error");
      }

      return !isTokenValid(credentialKey)
        ? Promise.resolve(credentialKey.access_token)
        : refreshAccessToken(credentialKey.refresh_token);
    },
  };
};

const LeverCalendarService = (credential: CredentialPayload) => {
  const translateEvent = async (event: CalendarEvent) => {
    /**
     * To convert the Cal's CalendarEvent type to a Lever scheduled interview type
     * @link https://hire.lever.co/developer/documentation#interviews
     */
    const timeZone = await getUserTimezoneFromDB(event.organizer?.id as number);
    return {
      title: event.title,
      date: dayjs(event.startTime).utc().format(),
      location: event.location,
      user: event.organizer,
      interviewers: event.attendees.map((attendee) => ({
        email: attendee.email,
      })),
      sendEmail: true,
      timezone: timeZone,
    };
  };

  const fetchLeverApi = async (endpoint: string, options?: RequestInit) => {
    const auth = leverAuth(credential);
    const accessToken = await auth.getToken();
    const log = logger.getSubLogger({ prefix: ["[[lib] lever"] });
    log.debug("result of accessToken in fetchLeverApi", safeStringify({ accessToken }));

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "GET",
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...options?.headers,
      },
    });
    const responseBody = await handleLeverResponse(response, credential.id);
    return responseBody;
  };

  return {
    getInterviews: async () => {
      /** @link https://hire.lever.co/developer/documentation#list-all-interviews */
      try {
        const responseBody = await fetchLeverApi("opportunities/interviews");
        const data = leverInterviewsSchema.parse(responseBody);

        return data.map((interview) => ({
          date: interview.date,
        }));
      } catch (err) {
        console.error(err);
        return [];
      }
    },
    createInterview: async (event: CalendarEvent) => {
      /** @link https://hire.lever.co/developer/documentation#create-an-interview */
      try {
        const response = await fetchLeverApi("opportunities/interviews", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(translateEvent(event)),
        });
        if (response.error) {
          if (response.error === "invalid_grant") {
            await invalidateCredential(credential.id);
            return Promise.reject(new Error("Invalid grant for Cal.com lever app"));
          }
        }

        const data = leverInterviewSchema.parse(response);

        if (data.id && data.location) {
          return {
            type: "lever_other",
            id: data.id.toString(),
            url: data.location,
          };
        }
        throw new Error(`Failed to create scheduled interview. Response is ${JSON.stringify(data)}`);
      } catch (err) {
        console.error(err);
        return [];
      }
    },

    updateInterview: async (uid: string) => {
      /** @link https://hire.lever.co/developer/documentation#update-an-interview */
      try {
        const response = await fetchLeverApi(`opportunities/interviews/${uid}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (response.error) {
          if (response.error === "invalid_grant") {
            await invalidateCredential(credential.id);
            return Promise.reject(new Error("Invalid grant for Cal.com lever app"));
          }
        }
        if (response.ok) {
          return;
        } else {
          throw new Error(`Failed to update scheduled interview for uid ${uid}`);
        }
      } catch (err) {
        console.error(err);
        return;
      }
    },

    deleteInterview: async (uid: string): Promise<void> => {
      /** @link https://hire.lever.co/developer/documentation#delete-an-interview */
      try {
        const response = await fetchLeverApi(`opportunities/interviews/${uid}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (response.error) {
          if (response.error === "invalid_grant") {
            await invalidateCredential(credential.id);
            return Promise.reject(new Error("Invalid grant for Cal.com lever app"));
          }
        }

        if (response.ok) {
          return;
        } else {
          throw new Error(`Failed to delete scheduled interview for uid ${uid}`);
        }
      } catch (err) {
        console.error(err);
        return;
      }
    },
  };
};

const handleLeverResponse = async (response: Response, credentialId: Credential["id"]) => {
  let _response = response.clone();
  const responseClone = response.clone();
  if (_response.headers.get("content-encoding") === "gzip") {
    const responseString = await response.text();
    _response = JSON.parse(responseString);
  }
  if (!response.ok || (response.status < 200 && response.status >= 300)) {
    const responseBody = await _response.json();

    if ((response && response.status === 124) || responseBody.error === "invalid_grant") {
      await invalidateCredential(credentialId);
    }
    throw Error(response.statusText);
  }
  if (response.status === 204) {
    return;
  }
  return responseClone.json();
};

const invalidateCredential = async (credentialId: Credential["id"]) => {
  const credential = await prisma.credential.findUnique({
    where: {
      id: credentialId,
    },
  });

  if (credential) {
    await prisma.credential.update({
      where: {
        id: credentialId,
      },
      data: {
        invalid: true,
      },
    });
  }
};

export default LeverCalendarService;
