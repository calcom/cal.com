import {
  APP_CREDENTIAL_SHARING_ENABLED,
  CREDENTIAL_SYNC_ENDPOINT,
  CREDENTIAL_SYNC_SECRET,
  CREDENTIAL_SYNC_SECRET_HEADER_NAME,
} from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import { invalidateCredential } from "../../_utils/invalidateCredential";
import { OAuthManager } from "../../_utils/oauth/OAuthManager";
import { getTokenObjectFromCredential } from "../../_utils/oauth/getTokenObjectFromCredential";
import { markTokenAsExpired } from "../../_utils/oauth/markTokenAsExpired";
import { LYRA_API_URL } from "./constants";
import { getLyraAppKeys } from "./getLyraAppKeys";

const log = logger.getSubLogger({ prefix: ["[lyra]"] });

const LyraVideoApiAdapter = (credential: CredentialPayload): VideoApiAdapter => {
  const tokenResponse = getTokenObjectFromCredential(credential);

  const fetchLyraApi = async (endpoint: string, options?: RequestInit) => {
    const auth = new OAuthManager({
      credentialSyncVariables: {
        APP_CREDENTIAL_SHARING_ENABLED,
        CREDENTIAL_SYNC_ENDPOINT,
        CREDENTIAL_SYNC_SECRET,
        CREDENTIAL_SYNC_SECRET_HEADER_NAME,
      },
      resourceOwner: {
        type: "user",
        id: credential.userId,
      },
      appSlug: "lyra",
      currentTokenObject: tokenResponse,
      fetchNewTokenObject: async ({ refreshToken }: { refreshToken: string | null }) => {
        if (!refreshToken) {
          return null;
        }
        const { client_id, client_secret } = await getLyraAppKeys();
        return fetch(`${LYRA_API_URL}/api/oauth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id,
            client_secret,
          }),
        });
      },
      isTokenObjectUnusable: async (response) => {
        if (!response.ok) {
          const responseToUseInCaseOfError = response.clone();
          let responseBody: { error?: string };
          try {
            responseBody = await response.json();
          } catch (_e) {
            log.error(
              "Lyra isTokenObjectUnusable: failed to parse response as JSON",
              safeStringify({
                status: response.status,
                body: await responseToUseInCaseOfError.text().catch(() => "<unreadable>"),
              })
            );
            return null;
          }
          if (responseBody.error === "invalid_grant") {
            return { reason: responseBody.error };
          }
        }
        return null;
      },
      isAccessTokenUnusable: async (response) => {
        if (response.status === 401) {
          return { reason: "access_token_expired" };
        }
        return null;
      },
      invalidateTokenObject: () => invalidateCredential(credential.id),
      expireAccessToken: () => markTokenAsExpired(credential),
      updateTokenObject: async (newTokenObject) => {
        await prisma.credential.update({
          where: {
            id: credential.id,
          },
          data: {
            key: newTokenObject as unknown as Prisma.InputJsonValue,
          },
        });
      },
    });

    const { json } = await auth.request({
      url: `${LYRA_API_URL}${endpoint}`,
      options: {
        method: "GET",
        ...options,
        headers: {
          ...options?.headers,
        },
      },
    });

    return json;
  };

  return {
    getAvailability: async () => {
      return [];
    },
    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      log.debug("Creating Lyra meeting", { title: event.title });

      try {
        const data = (await fetchLyraApi("/api/v1/meeting", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: event.title,
            start: event.startTime,
            attendees: event.attendees.map((attendee) => attendee.email),
          }),
        })) as { id: string; url: string; password?: string };

        log.debug("Lyra meeting created", { id: data.id, url: data.url });

        return {
          type: "lyra_video",
          id: data.id,
          password: data.password || "",
          url: data.url,
        };
      } catch (err) {
        log.error("Lyra meeting creation failed", safeStringify(err));
        throw new Error("Failed to create Lyra meeting");
      }
    },
    deleteMeeting: async (uid: string): Promise<void> => {
      log.debug("Delete meeting called (no-op)", { uid });
    },
    updateMeeting: async (bookingRef: PartialReference, _event: CalendarEvent): Promise<VideoCallData> => {
      log.debug("Update meeting called (no-op)", { uid: bookingRef.uid });
      return {
        type: "lyra_video",
        id: bookingRef.meetingId as string,
        password: bookingRef.meetingPassword as string,
        url: bookingRef.meetingUrl as string,
      };
    },
  };
};

export default LyraVideoApiAdapter;
