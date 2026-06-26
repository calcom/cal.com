import { z } from "zod";

import { triggerDelegationCredentialErrorWebhook } from "@calcom/features/webhooks/lib/triggerDelegationCredentialErrorWebhook";
import {
  CalendarAppDelegationCredentialConfigurationError,
  CalendarAppDelegationCredentialInvalidGrantError,
} from "@calcom/lib/CalendarAppError";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
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
}

const o365VideoAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

/**
 * Retrieves and validates the Office 365 Video app's OAuth client credentials
 * (`client_id` / `client_secret`) from the app config slug.
 */
const getO365VideoAppKeys = async () => {
  return getParsedAppKeysFromSlug(config.slug, o365VideoAppKeysSchema);
};

const TeamsVideoApiAdapter = (credential: CredentialForCalendarServiceWithTenantId): VideoApiAdapter => {
  const log = logger.getSubLogger({ prefix: ["TeamsVideoApiAdapter"] });
  let azureUserId: string | null;
  const tokenResponse = oAuthManagerHelper.getTokenObjectFromCredential(credential);

  /**
   * Fires the delegation-credential error webhook when a DelegationCredential
   * is misconfigured or its grant is invalid, so admins are notified out-of-band.
   * No-ops if the credential is not associated with a delegated user/app.
   */
  async function triggerDelegationCredentialError(error: Error): Promise<void> {
    if (credential.userId && credential.user && credential.appId && credential.delegatedToId) {
      await triggerDelegationCredentialErrorWebhook({
        error,
        credential: {
          id: credential.id,
          type: credential.type,
          appId: credential.appId,
        },
        user: {
          id: credential.userId ?? 0,
          email: credential.user.email,
        },
        delegationCredentialId: credential.delegatedToId,
      });
    }
  }

  const auth = new OAuthManager({
    credentialSyncVariables: oAuthManagerHelper.credentialSyncVariables,
    resourceOwner: {
      type: "user",
      id: credential.userId,
    },
    appSlug: config.slug,
    currentTokenObject: tokenResponse,
    fetchNewTokenObject: async ({ refreshToken }: { refreshToken: string | null }) => {
      const isDelegated = Boolean(credential?.delegatedTo);
      if (!isDelegated && !refreshToken) {
        return null;
      }

      const credentials = isDelegated
        ? {
            client_id: credential?.delegatedTo?.serviceAccountKey?.client_id,
            client_secret: credential?.delegatedTo?.serviceAccountKey?.private_key,
          }
        : await getO365VideoAppKeys();

      if (isDelegated && (!credentials.client_id || !credentials.client_secret)) {
        const error = new CalendarAppDelegationCredentialConfigurationError(
          "Delegation credential without clientId or Secret"
        );

        await triggerDelegationCredentialError(error);

        throw error;
      }

      const url = await getAuthUrl(isDelegated, credential?.delegatedTo?.serviceAccountKey?.tenant_id);
      const scope = isDelegated ? "https://graph.microsoft.com/.default" : OFFICE365_VIDEO_SCOPES.join(" ");

      const params: Record<string, string> = {
        scope,
        client_id: credentials.client_id || "",
        client_secret: credentials.client_secret || "",
        grant_type: isDelegated ? "client_credentials" : "refresh_token",
        ...(isDelegated ? {} : { refresh_token: refreshToken ?? "" }),
      };

      return await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params),
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
    updateTokenObject: (tokenObject) => {
      if (!credential.delegatedTo) {
        return oAuthManagerHelper.updateTokenObject({ tokenObject, credentialId: credential.id });
      }
      return Promise.resolve();
    },
  });

  /**
   * Builds the Microsoft Identity Platform token endpoint URL.
   * For DelegationCredential flows this requires a tenantId and throws a
   * CalendarAppDelegationCredentialInvalidGrantError (and fires the error
   * webhook) if one isn't present; otherwise falls back to the common/multi-tenant endpoint.
   */
  async function getAuthUrl(delegatedTo: boolean, tenantId?: string): Promise<string> {
    if (delegatedTo) {
      if (!tenantId) {
        const error = new CalendarAppDelegationCredentialInvalidGrantError(
          "Invalid DelegationCredential Settings: tenantId is missing"
        );

        await triggerDelegationCredentialError(error);

        throw error;
      }
      return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    }

    return "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  }

  /**
   * Maps a Cal.com CalendarEvent into the subset of fields the Microsoft
   * Graph onlineMeetings API expects (startDateTime/endDateTime/subject).
   */
  const translateEvent = (event: CalendarEvent) => {
    return {
      startDateTime: event.startTime,
      endDateTime: event.endTime,
      subject: event.title,
    };
  };

  /**
   * Resolves the Azure AD user id for a DelegationCredential by exchanging
   * client credentials for an app-only token and looking the user up by email
   * via the Graph `/users` endpoint. Returns null for non-delegated credentials,
   * caches the result in `azureUserId`, and throws/fires the delegation error
   * webhook if the credential is misconfigured or the user can't be found.
   */
  async function getAzureUserId(credential: CredentialForCalendarServiceWithTenantId) {
    if (azureUserId) return azureUserId;

    const isDelegated = Boolean(credential?.delegatedTo);

    if (!isDelegated) return null;

    const url = await getAuthUrl(isDelegated, credential?.delegatedTo?.serviceAccountKey?.tenant_id);

    const delegationCredentialClientId = credential.delegatedTo?.serviceAccountKey?.client_id;
    const delegationCredentialClientSecret = credential.delegatedTo?.serviceAccountKey?.private_key;

    if (!delegationCredentialClientId || !delegationCredentialClientSecret) {
      const error = new CalendarAppDelegationCredentialConfigurationError(
        "Delegation credential without clientId or Secret"
      );

      await triggerDelegationCredentialError(error);

      throw error;
    }
    const loginResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        scope: "https://graph.microsoft.com/.default",
        client_id: delegationCredentialClientId,
        grant_type: "client_credentials",
        client_secret: delegationCredentialClientSecret,
      }),
    });

    const clonedResponse = loginResponse.clone();
    const parsedLoginResponse = await clonedResponse.json();
    const token = parsedLoginResponse?.access_token;
    const oauthClientIdAliasRegex = /\+[a-zA-Z0-9]{25}/;
    const email = credential?.user?.email.replace(oauthClientIdAliasRegex, "");
    const encodedFilter = encodeURIComponent(`mail eq '${email}'`);
    const queryParams = `$filter=${encodedFilter}`;

    const response = await fetch(`https://graph.microsoft.com/v1.0/users?${queryParams}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${token}`,
      },
    });

    const parsedBody = await response.json();

    if (!parsedBody?.value?.[0]?.id) {
      const error = new CalendarAppDelegationCredentialInvalidGrantError(
        "User might not exist in Microsoft Azure Active Directory"
      );

      await triggerDelegationCredentialError(error);

      throw error;
    }
    azureUserId = parsedBody.value[0].id;
    return azureUserId;
  }

  /**
   * Returns the Microsoft Graph base URL to use for onlineMeetings requests:
   * the specific delegated user's `/users/{id}` endpoint when a DelegationCredential
   * is in play, otherwise the authenticated `/me` endpoint.
   */
  async function getUserEndpoint(): Promise<string> {
    const azureUserId = await getAzureUserId(credential);
    return azureUserId
      ? `https://graph.microsoft.com/v1.0/users/${azureUserId}`
      : "https://graph.microsoft.com/v1.0/me";
  }

  const adapter: VideoApiAdapter = {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    /**
     * Deletes a Teams online meeting via `DELETE /onlineMeetings/{uid}`.
     * A 404 from Microsoft (meeting already gone) is treated as a successful
     * no-op rather than an error, since the end state we want is already true.
     */
    deleteMeeting: async (uid: string): Promise<void> => {
      try {
        const response = await auth.requestRaw({
          url: `${await getUserEndpoint()}/onlineMeetings/${uid}`,
          options: {
            method: "DELETE",
          },
        });

        if (!response.ok && response.status !== 404) {
          throw new HttpError({
            statusCode: response.status,
            message: response.statusText,
          });
        }

        log.debug("Teams meeting deleted", { meetingId: uid });
        return Promise.resolve();
      } catch (error) {
        log.error(`Error deleting MS Teams meeting ${uid}`, error);
        if (error instanceof HttpError) {
          throw error;
        }
        throw new HttpError({
          statusCode: 500,
          message: `Error deleting MS Teams meeting ${uid}`,
        });
      }
    },
    /**
     * Updates an existing Teams meeting via `PATCH /onlineMeetings/{meetingId}`
     * instead of re-POSTing (which previously created duplicate meetings).
     * Falls back to `createMeeting` when no `meetingId` is present on the
     * booking reference, and falls back to the previously stored meeting URL
     * if the PATCH response is missing `joinWebUrl`.
     */
    updateMeeting: async (bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> => {
      const meetingId = bookingRef.meetingId;

      // If no meetingId is available, fall back to creating a new meeting
      if (!meetingId) {
        log.warn(`No meetingId found in bookingRef for booking ${event.uid}, falling back to createMeeting`);
        return adapter!.createMeeting(event);
      }

      try {
        const patchResponse = await auth.requestRaw({
          url: `${await getUserEndpoint()}/onlineMeetings/${meetingId}`,
          options: {
            method: "PATCH",
            body: JSON.stringify(translateEvent(event)),
          },
        });

        if (!patchResponse.ok) {
          throw new HttpError({
            statusCode: patchResponse.status,
            message: patchResponse.statusText,
          });
        }

        // PATCH returns 200 with the updated meeting object
        const resultString = await patchResponse.text();
        const resultObject = JSON.parse(resultString);

        log.debug("Teams meeting updated", { meetingId });

        const joinUrl = resultObject.joinWebUrl || bookingRef.meetingUrl;
        if (!joinUrl) {
          throw new HttpError({
            statusCode: 500,
            message: `Error updating MS Teams meeting ${meetingId}: response is missing joinWebUrl and no existing meeting URL is available`,
          });
        }

        return Promise.resolve({
          type: "office365_video",
          id: resultObject.id ?? meetingId,
          password: "",
          url: joinUrl,
        });
      } catch (error) {
        log.error(`Error updating MS Teams meeting for booking ${event.uid}`, error);
        if (error instanceof HttpError) {
          throw error;
        }
        throw new HttpError({
          statusCode: 500,
          message: `Error updating MS Teams meeting for booking ${event.uid}`,
        });
      }
    },
    /**
     * Creates a new Teams online meeting via `POST /onlineMeetings`.
     * Treats a response missing `id` or `joinWebUrl` as a failure even when
     * the HTTP status itself is OK, since both fields are required downstream.
     */
    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      const url = `${await getUserEndpoint()}/onlineMeetings`;
      try {
        const response = await auth.requestRaw({
          url,
          options: {
            method: "POST",
            body: JSON.stringify(translateEvent(event)),
          },
        });

        if (!response.ok) {
          throw new HttpError({
            statusCode: response.status,
            message: response.statusText,
          });
        }

        const resultString = await response.text();

        const resultObject = JSON.parse(resultString);

        if (!resultObject.id || !resultObject.joinWebUrl) {
          throw new HttpError({
            statusCode: 500,
            message: `Error creating MS Teams meeting: ${resultObject.error?.message || "missing required fields in response"}`,
          });
        }

        log.debug("Teams meeting created", { meetingId: resultObject.id });

        return Promise.resolve({
          type: "office365_video",
          id: resultObject.id,
          password: "",
          url: resultObject.joinWebUrl,
        });
      } catch (error) {
        log.error(`Error creating MS Teams meeting for booking ${event.uid}`, error);
        if (error instanceof HttpError) {
          throw error;
        }
        throw new HttpError({
          statusCode: 500,
          message: `Error creating MS Teams meeting for booking ${event.uid}`,
        });
      }
    },
  };
  return adapter;
};

export default TeamsVideoApiAdapter;
