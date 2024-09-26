import { z } from "zod";

import { handleErrorsRaw } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";
import { OAuthManager } from "../../_utils/oauth/OAuthManager";
import { oAuthManagerHelper } from "../../_utils/oauth/oAuthManagerHelper";
import config from "../config.json";

/** @link https://docs.microsoft.com/en-us/graph/api/application-post-onlinemeetings?view=graph-rest-1.0&tabs=http#response */
export interface TeamsEventResult {
  creationDateTime: string;
  startDateTime: string;
  endDateTime: string;
  id: string;
  joinWebUrl: string;
  subject: string;
}

const o365VideoAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

const getO365VideoAppKeys = async () => {
  return getParsedAppKeysFromSlug(config.slug, o365VideoAppKeysSchema);
};

const TeamsVideoApiAdapter = (credential: CredentialPayload): VideoApiAdapter => {
  const tokenResponse = oAuthManagerHelper.getTokenObjectFromCredential(credential);

  const auth = new OAuthManager({
    credentialSyncVariables: oAuthManagerHelper.credentialSyncVariables,
    resourceOwner: {
      type: "user",
      id: credential.userId,
    },
    appSlug: config.slug,
    currentTokenObject: tokenResponse,
    fetchNewTokenObject: async ({ refreshToken }: { refreshToken: string | null }) => {
      if (!refreshToken) {
        return null;
      }
      const { client_id, client_secret } = await getO365VideoAppKeys();
      return await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
          client_secret,
        }),
      });
    },
    isTokenObjectUnusable: async function () {
      // TODO: Implement this. As current implementation of CalendarService doesn't handle it. It hasn't been handled in the OAuthManager implementation as well.
      // This is a placeholder for future implementation.
      return null;
    },
    isAccessTokenUnusable: async function () {
      // TODO: Implement this
      return null;
    },
    invalidateTokenObject: () => oAuthManagerHelper.invalidateCredential(credential.id),
    expireAccessToken: () => oAuthManagerHelper.markTokenAsExpired(credential),
    updateTokenObject: (tokenObject) =>
      oAuthManagerHelper.updateTokenObject({ tokenObject, credentialId: credential.id }),
  });

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
      const resultString = await auth
        .requestRaw({
          url: "https://graph.microsoft.com/v1.0/me/onlineMeetings",
          options: {
            method: "POST",
            body: JSON.stringify(translateEvent(event)),
          },
        })
        .then(handleErrorsRaw);

      const resultObject = JSON.parse(resultString);

      return Promise.resolve({
        type: "office365_video",
        id: resultObject.id,
        password: "",
        url: resultObject.joinWebUrl || resultObject.joinUrl,
      });
    },
    deleteMeeting: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      const resultString = await auth
        .requestRaw({
          url: "https://graph.microsoft.com/v1.0/me/onlineMeetings",
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
