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
import * as oAuthManagerHelperModule from "../../_utils/oauth/oAuthManagerHelper";
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
  const appKeys = await getParsedAppKeysFromSlug(config.slug);
  return o365VideoAppKeysSchema.parse(appKeys);
};

// Get the Microsoft Graph API endpoint for the user
const getUserEndpoint = () => {
  return Promise.resolve("https://graph.microsoft.com/v1.0/me");
};

// Function to translate Cal.com event to Microsoft Teams meeting format
const translateEvent = (event: CalendarEvent) => {
  return {
    startDateTime: event.startTime,
    endDateTime: event.endTime,
    subject: event.title,
  };
};

const TeamsVideoApiAdapter = (credential: CredentialForCalendarServiceWithTenantId): VideoApiAdapter => {
  const oAuthManagerHelper = oAuthManagerHelperModule.oAuthManagerHelper;
  
  const auth = new OAuthManager({
    providerName: "office365_video",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    clientId: "",
    clientSecret: "",
    scopes: OFFICE365_VIDEO_SCOPES,
    tokenGetter: async () => {
      const appKeys = await getO365VideoAppKeys();
      const tokenObject = await oAuthManagerHelper.getTokenObjectFromCredential(credential, appKeys.client_id);
      return tokenObject;
    },
    tokenSetter: async (tokenObject) => {
      await oAuthManagerHelper.updateTokenObject(credential, tokenObject);
    },
    tokenExpireHandler: async (tokenObject) => {
      await oAuthManagerHelper.markTokenAsExpired(credential);
    },
    tokenInvalidHandler: async () => {
      await oAuthManagerHelper.invalidateCredential(credential);
    },
  });

  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    updateMeeting: async (bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> => {
      try {
        return await this.createMeeting(event);
      } catch (error) {
        throw new HttpError({ statusCode: 500, message: "Internal Server Error" });
      }
    },
    deleteMeeting: async (uid: string): Promise<void> => {
      return Promise.resolve();
    },
    getMeeting: async (uid: string): Promise<VideoCallData> => {
      return Promise.resolve({} as VideoCallData);
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
