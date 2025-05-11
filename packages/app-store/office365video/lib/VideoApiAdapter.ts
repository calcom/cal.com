import { z } from "zod";

import {
  CalendarAppDelegationCredentialConfigurationError,
  CalendarAppDelegationCredentialInvalidGrantError,
} from "@calcom/lib/CalendarAppError";
import { handleErrorsRaw } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialForCalendarServiceWithTenantId } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";
import { OAuthManager } from "../../_utils/oauth/OAuthManager";
import { oAuthManagerHelper } from "../../_utils/oauth/oAuthManagerHelper";
import { OFFICE365_VIDEO_SCOPES } from "../api/add";
import config from "../config.json";

/** @link https://docs.microsoft.com/en-us/graph/api/application-post-onlinemeetings?view=graph-rest-1.0&tabs=http#response */
export interface TeamsEventResult {
  creationDateTime: string;
  startDateTime: string;
  endDateTime: string;
  id: string;
  joinWebUrl: string;
  subject: string;
  error?: {
    message?: string;
  };
}

const o365VideoAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

const getO365VideoAppKeys = async () => {
  return getParsedAppKeysFromSlug(config.slug, o365VideoAppKeysSchema);
};

const getUserEndpoint = async () => {
  return "https://graph.microsoft.com/v1.0/me";
};

const translateEvent = (event: CalendarEvent) => {
  return {
    subject: event.title,
    startDateTime: event.startTime,
    endDateTime: event.endTime,
  };
};

const TeamsVideoApiAdapter = (credential: CredentialForCalendarServiceWithTenantId): VideoApiAdapter => {
  const auth = oAuthManagerHelper({
    providerName: "office365-video",
    tokenObjectFromCredential: {
      scope: OFFICE365_VIDEO_SCOPES.join(" "),
      token_type: credential.key.token_type,
      access_token: credential.key.access_token,
      refresh_token: credential.key.refresh_token,
      expiry_date: credential.key.expiry_date,
    },
    refreshAccessToken: async ({ refreshToken }) => {
      try {
        const { client_id, client_secret } = await getO365VideoAppKeys();
        const appConfig = {
          clientId: client_id,
          clientSecret: client_secret,
          redirectURI: "https://api.cal.com/v1/auth/office365video/callback",
        };
        const oAuth = new OAuthManager();
        return oAuth.refreshAccessToken(refreshToken, appConfig);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("invalid_grant")) {
            throw new CalendarAppDelegationCredentialInvalidGrantError(error.message);
          }
          if (error.message.includes("invalid_client")) {
            throw new CalendarAppDelegationCredentialConfigurationError(error.message);
          }
        }
        throw error;
      }
    },
    getTokens: async ({ code }) => {
      try {
        const { client_id, client_secret } = await getO365VideoAppKeys();
        const appConfig = {
          clientId: client_id,
          clientSecret: client_secret,
          redirectURI: "https://api.cal.com/v1/auth/office365video/callback",
        };
        const oAuth = new OAuthManager();
        return oAuth.getTokens(code, appConfig);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("invalid_grant")) {
            throw new CalendarAppDelegationCredentialInvalidGrantError(error.message);
          }
          if (error.message.includes("invalid_client")) {
            throw new CalendarAppDelegationCredentialConfigurationError(error.message);
          }
        }
        throw error;
      }
    },
  });

  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      // Create a Teams meeting using the Microsoft Graph API
      const url = `${await getUserEndpoint()}/onlineMeetings`;
      
      const resultString = await auth
        .requestRaw({
          url,
          options: {
            method: "POST",
            body: JSON.stringify(translateEvent(event)),
          },
        })
        .then(handleErrorsRaw);

      const resultObject = JSON.parse(resultString);

      if (!resultObject.id || !resultObject.joinUrl || !resultObject.joinWebUrl) {
        throw new HttpError({
          statusCode: 500,
          message: `Error creating MS Teams meeting: ${resultObject.error?.message || "Unknown error"}`,
        });
      }
      
      // Return the meeting data in the format expected by Cal.com
      // The videoCallData.type is used in the calendar integration to properly format the event
      return Promise.resolve({
        type: "office365_video",
        id: resultObject.id,
        password: "",
        url: resultObject.joinWebUrl || resultObject.joinUrl
      });
    },
  };
};

export default TeamsVideoApiAdapter;
