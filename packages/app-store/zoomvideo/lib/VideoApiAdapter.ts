import { z } from "zod";

import dayjs from "@calcom/dayjs";
import {
  APP_CREDENTIAL_SHARING_ENABLED,
  CREDENTIAL_SYNC_ENDPOINT,
  CREDENTIAL_SYNC_SECRET,
  CREDENTIAL_SYNC_SECRET_HEADER_NAME,
} from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { getPiiFreeCalendarEvent } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import { Frequency } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import { invalidateCredential } from "../../_utils/invalidateCredential";
import { OAuthManager } from "../../_utils/oauth/OAuthManager";
import { getTokenObjectFromCredential } from "../../_utils/oauth/getTokenObjectFromCredential";
import { markTokenAsExpired } from "../../_utils/oauth/markTokenAsExpired";
import { metadata } from "../_metadata";
import { getZoomAppKeys } from "./getZoomAppKeys";

const log = logger.getSubLogger({ prefix: ["app-store/zoomvideo/lib/VideoApiAdapter"] });

/** @link https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingcreate */
const zoomEventResultSchema = z.object({
  id: z.number(),
  join_url: z.string(),
  password: z.string().optional().default(""),
});

export type ZoomEventResult = z.infer<typeof zoomEventResultSchema>;

/** @link https://marketplace.zoom.us/docs/api-reference/zoom-api/methods/#operation/meetings */
export const zoomMeetingsSchema = z.object({
  next_page_token: z.string(),
  page_count: z.number(),
  page_number: z.number(),
  page_size: z.number(),
  total_records: z.number(),
  meetings: z.array(
    z.object({
      agenda: z.string(),
      created_at: z.string(),
      duration: z.number(),
      host_id: z.string(),
      id: z.number(),
      join_url: z.string(),
      pmi: z.string(),
      start_time: z.string(),
      timezone: z.string(),
      topic: z.string(),
      type: z.number(),
      uuid: z.string(),
    })
  ),
});

export type ZoomUserSettings = z.infer<typeof zoomUserSettingsSchema>;

/** @link https://developers.zoom.us/docs/api/rest/reference/user/methods/#operation/userSettings */
export const zoomUserSettingsSchema = z.object({
  recording: z
    .object({
      auto_recording: z.string().nullish(),
    })
    .nullish(),
  schedule_meeting: z
    .object({
      default_password_for_scheduled_meetings: z.string().nullish(),
    })
    .nullish(),
  in_meeting: z
    .object({
      waiting_room: z.boolean(),
    })
    .nullish(),
});

// https://developers.zoom.us/docs/api/rest/reference/user/methods/#operation/userSettings
// append comma separated settings here, to retrieve only these specific settings
const settingsApiFilterResp = "default_password_for_scheduled_meetings,auto_recording,waiting_room";

/**
 * Zoom Recurrence Type
 * @link https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/meetingCreate
 */
type ZoomRecurrence = {
  end_date_time?: string; // Recurrence end datetime (RFC3339)
  type: 1 | 2 | 3; // 1=Daily, 2=Weekly, 3=Monthly
  end_times?: number; // Number of occurrences
  repeat_interval?: number; // Interval between occurrences
  weekly_days?: number; // 1-7, Sunday=1, Saturday=7 (for weekly)
  monthly_day?: number; // 1-31 (for monthly)
};

const ZoomVideoApiAdapter = (credential: CredentialPayload): VideoApiAdapter => {
  const tokenResponse = getTokenObjectFromCredential(credential);

  const getUserSettings = async () => {
    let userSettings: ZoomUserSettings | undefined;
    try {
      const responseBody = await fetchZoomApi(
        `users/me/settings?custom_query_fields=${settingsApiFilterResp}`
      );
      userSettings = zoomUserSettingsSchema.parse(responseBody);
    } catch (err) {
      log.error("Failed to retrieve zoom user settings", safeStringify(err));
    }
    return userSettings;
  };

  const translateEvent = async (event: CalendarEvent) => {
    const getRecurrence = ({
      recurringEvent,
      startTime,
      attendees,
    }: CalendarEvent): { recurrence: ZoomRecurrence } | undefined => {
      if (!recurringEvent) {
        return;
      }

      let recurrence: ZoomRecurrence;

      switch (recurringEvent.freq) {
        case Frequency.DAILY:
          recurrence = {
            type: 1,
          };
          break;
        case Frequency.WEEKLY:
          recurrence = {
            type: 2,
            weekly_days: dayjs(startTime).tz(attendees[0].timeZone).day() + 1,
          };
          break;
        case Frequency.MONTHLY:
          recurrence = {
            type: 3,
            monthly_day: dayjs(startTime).tz(attendees[0].timeZone).date(),
          };
          break;
        default:
          // Zoom does not support YEARLY, HOURLY or MINUTELY frequencies
          log.warn("Zoom does not support this frequency, skipping recurrence", {
            freq: recurringEvent.freq,
          });
          return;
      }

      recurrence.repeat_interval = recurringEvent.interval;

      if (recurringEvent.until) {
        recurrence.end_date_time = recurringEvent.until.toISOString();
      } else {
        recurrence.end_times = recurringEvent.count;
      }

      return {
        recurrence: {
          ...recurrence,
        },
      };
    };

    // Zoom agenda field has a 2000 character limit; we set maxLength to 1900 to leave a safety buffer
    const truncateAgenda = (description?: string | null) => {
      if (!description) return description;

      const maxLength = 1900;
      const trimmed = description.trimEnd();
      if (trimmed.length > maxLength) {
        return `${trimmed.substring(0, maxLength).trimEnd()}...`;
      }
      return trimmed;
    };

    const userSettings = await getUserSettings();
    const recurrence = getRecurrence(event);
    const waitingRoomEnabled = userSettings?.in_meeting?.waiting_room ?? false;
    // Documentation at: https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingcreate
    const meetingPayload = {
      topic: event.title,
      type: recurrence ? 8 : 2, // 8=Recurring with fixed time, 2=Scheduled meeting
      start_time: dayjs(event.startTime).utc().format(),
      duration: (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 60000,
      //schedule_for: "string",   TODO: Used when scheduling the meeting for someone else (needed?)
      timezone: event.organizer.timeZone,
      password: userSettings?.schedule_meeting?.default_password_for_scheduled_meetings ?? undefined,
      agenda: truncateAgenda(event.description),
      settings: {
        host_video: true,
        participant_video: true,
        cn_meeting: false, // TODO: true if host meeting in China
        in_meeting: false, // TODO: true if host meeting in India
        join_before_host: !waitingRoomEnabled,
        mute_upon_entry: false,
        watermark: false,
        use_pmi: false,
        approval_type: 2,
        audio: "both",
        auto_recording: userSettings?.recording?.auto_recording || "none",
        enforce_login: false,
        registrants_email_notification: true,
        waiting_room: waitingRoomEnabled,
      },
      ...recurrence,
    };
    return meetingPayload;
  };

  /**
   * Extracts occurrence ID from a UID that may be in format:
   * - "meetingId" (delete entire series)
   * - "meetingId:occurrenceId" (delete specific occurrence)
   */
  const extractOccurrenceId = (uid: string): { meetingId: string; occurrenceId?: string } => {
    const parts = uid.split(":");
    if (parts.length === 2) {
      return { meetingId: parts[0], occurrenceId: parts[1] };
    }
    return { meetingId: uid };
  };

  /**
   * Zoom is known to return xml response in some cases.
   * e.g. Wrong request or some special case of invalid token
   */
  const handleZoomResponseJsonParseError = async ({
    error,
    clonedResponse,
  }: {
    error: unknown;
    clonedResponse: Response;
  }) => {
    // In some cases, Zoom responds with xml response, so we log the response for debugging
    // We need to see why that error occurs exactly and then later we decide if mark the access token and token object unusable or not
    log.error(
      "Error in JSON parsing Zoom API response",
      safeStringify({
        error: safeStringify(error),
        // Log Raw response body here.
        responseBody: await clonedResponse.text(),
        status: clonedResponse.status,
      })
    );

    return null;
  };

  /**
   * Deletes a specific occurrence of a recurring Zoom meeting
   * @link https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/meetingDelete
   *
   * Zoom uses occurrence_id query parameter to delete specific occurrence:
   * DELETE /meetings/{meetingId}?occurrence_id={occurrenceId}
   */
  const deleteRecurringInstance = async (uid: string): Promise<void> => {
    try {
      const { meetingId, occurrenceId } = extractOccurrenceId(uid);

      if (!occurrenceId) {
        log.warn("No occurrence_id provided, deleting entire meeting series", { uid });
        await fetchZoomApi(`meetings/${meetingId}`, {
          method: "DELETE",
        });
        return;
      }

      log.info("Deleting Zoom recurring instance", {
        meetingId,
        occurrenceId,
      });

      // Delete specific occurrence using occurrence_id query parameter
      await fetchZoomApi(`meetings/${meetingId}?occurrence_id=${occurrenceId}`, {
        method: "DELETE",
      });

      log.info("Zoom recurring instance deleted successfully", {
        meetingId,
        occurrenceId,
      });

      return Promise.resolve();
    } catch (err) {
      log.error("Failed to delete recurring instance", {
        error: err,
        uid,
      });
      return Promise.reject(new Error("Failed to delete recurring instance"));
    }
  };

  /**
   * Updates a specific occurrence of a recurring Zoom meeting
   * @link https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/meetingUpdate
   *
   * Zoom uses occurrence_id query parameter to update specific occurrence:
   * PATCH /meetings/{meetingId}?occurrence_id={occurrenceId}
   */
  const updateRecurringInstance = async (
    uid: string,
    occurrenceId: string,
    event: CalendarEvent
  ): Promise<VideoCallData> => {
    try {
      log.info("Updating Zoom recurring instance", {
        uid,
        occurrenceId,
        newStart: event.startTime,
        newEnd: event.endTime,
      });

      // Update specific occurrence using occurrence_id query parameter
      await fetchZoomApi(`meetings/${uid}?occurrence_id=${occurrenceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(await translateEvent(event)),
      });

      // Fetch updated occurrence details
      // Note: Zoom returns the master meeting details, but the occurrence is updated
      const updatedMeeting = await fetchZoomApi(`meetings/${uid}`);
      const result = zoomEventResultSchema.parse(updatedMeeting);

      log.info("Zoom recurring instance updated successfully", {
        meetingId: uid,
        occurrenceId,
      });

      return {
        type: "zoom_video",
        id: result.id.toString(),
        password: result.password || "",
        url: result.join_url,
      };
    } catch (err) {
      log.error("Failed to update recurring instance", {
        error: err,
        uid,
        occurrenceId,
      });
      return Promise.reject(new Error("Failed to update recurring instance"));
    }
  };

  const fetchZoomApi = async (endpoint: string, options?: RequestInit) => {
    const auth = new OAuthManager({
      credentialSyncVariables: {
        APP_CREDENTIAL_SHARING_ENABLED: APP_CREDENTIAL_SHARING_ENABLED,
        CREDENTIAL_SYNC_ENDPOINT: CREDENTIAL_SYNC_ENDPOINT,
        CREDENTIAL_SYNC_SECRET: CREDENTIAL_SYNC_SECRET,
        CREDENTIAL_SYNC_SECRET_HEADER_NAME: CREDENTIAL_SYNC_SECRET_HEADER_NAME,
      },
      resourceOwner: {
        type: "user",
        id: credential.userId,
      },
      appSlug: metadata.slug,
      currentTokenObject: tokenResponse,
      fetchNewTokenObject: async ({ refreshToken }: { refreshToken: string | null }) => {
        if (!refreshToken) {
          return null;
        }
        const clientCredentials = await getZoomAppKeys();
        const { client_id, client_secret } = clientCredentials;
        const authHeader = `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString("base64")}`;
        return fetch("https://zoom.us/oauth/token", {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        });
      },
      isTokenObjectUnusable: async function (response) {
        const myLog = logger.getSubLogger({ prefix: ["zoomvideo:isTokenObjectUnusable"] });
        myLog.info(safeStringify({ status: response.status, ok: response.ok }));
        if (!response.ok) {
          let responseBody;
          const responseToUseInCaseOfError = response.clone();
          try {
            responseBody = await response.json();
          } catch (e) {
            return await handleZoomResponseJsonParseError({
              error: e,
              clonedResponse: responseToUseInCaseOfError,
            });
          }
          myLog.debug(safeStringify({ responseBody }));

          if (responseBody.error === "invalid_grant") {
            return { reason: responseBody.error };
          }
        }
        return null;
      },
      isAccessTokenUnusable: async function (response) {
        const myLog = logger.getSubLogger({ prefix: ["zoomvideo:isAccessTokenUnusable"] });
        myLog.info(safeStringify({ status: response.status, ok: response.ok }));
        if (!response.ok) {
          let responseBody;
          const responseToUseInCaseOfError = response.clone();
          try {
            responseBody = await response.json();
          } catch (e) {
            return await handleZoomResponseJsonParseError({
              error: e,
              clonedResponse: responseToUseInCaseOfError,
            });
          }
          myLog.debug(safeStringify({ responseBody }));
          // 124 is the error code for invalid access token from Zoom API
          if (responseBody.code === 124) {
            return { reason: responseBody.message ?? "" };
          }
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
            key: newTokenObject,
          },
        });
      },
    });

    const { json } = await auth.request({
      url: `https://api.zoom.us/v2/${endpoint}`,
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
      try {
        // TODO Possibly implement pagination for cases when there are more than 300 meetings already scheduled.
        const responseBody = await fetchZoomApi("users/me/meetings?type=scheduled&page_size=300");

        const data = zoomMeetingsSchema.parse(responseBody);
        return data.meetings.map((meeting) => ({
          start: meeting.start_time,
          end: new Date(new Date(meeting.start_time).getTime() + meeting.duration * 60000).toISOString(),
        }));
      } catch (err) {
        log.error("Failed to get availability", safeStringify(err));
        /* Prevents booking failure when Zoom Token is expired */
        return [];
      }
    },
    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      try {
        const response = await fetchZoomApi("users/me/meetings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(await translateEvent(event)),
        });

        const result = zoomEventResultSchema.parse(response);

        if (result.id && result.join_url) {
          return {
            type: "zoom_video",
            id: result.id.toString(),
            password: result.password || "",
            url: result.join_url,
          };
        }
        throw new Error(`Failed to create meeting. Response is ${JSON.stringify(result)}`);
      } catch (err) {
        log.error(
          "Zoom meeting creation failed",
          safeStringify({ error: safeStringify(err), event: getPiiFreeCalendarEvent(event) })
        );
        /* Prevents meeting creation failure when Zoom Token is expired */
        throw new Error("Unexpected error");
      }
    },
    updateMeeting: async (bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> => {
      try {
        log.debug("Updating Zoom meeting", {
          uid: bookingRef.uid,
          hasRescheduleInstance: !!event.rescheduleInstance,
        });

        // Check if this is a recurring instance update
        if (event.rescheduleInstance) {
          log.info("Detected recurring instance reschedule", {
            uid: bookingRef.uid,
            formerTime: event.rescheduleInstance.formerTime,
            newTime: event.rescheduleInstance.newTime,
          });

          // For Zoom, we need to get the occurrence_id
          // The occurrence_id is the original start time of the occurrence
          const occurrenceId = `${dayjs(event.rescheduleInstance.formerTime)
            .utc()
            .format("YYYYMMDDTHHmmss")}Z`;

          log.debug("Generated occurrence_id for Zoom", { occurrenceId });

          // Use the updateRecurringInstance method
          return await updateRecurringInstance(bookingRef.uid, occurrenceId, event);
        }

        // Standard meeting update
        await fetchZoomApi(`meetings/${bookingRef.uid}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(await translateEvent(event)),
        });

        const updatedMeeting = await fetchZoomApi(`meetings/${bookingRef.uid}`);
        const result = zoomEventResultSchema.parse(updatedMeeting);

        log.info("Zoom meeting updated successfully", {
          meetingId: result.id,
        });

        return {
          type: "zoom_video",
          id: result.id.toString(),
          password: result.password || "",
          url: result.join_url,
        };
      } catch (err) {
        log.error(
          "Failed to update meeting",
          safeStringify({ error: err, event: getPiiFreeCalendarEvent(event) })
        );
        return Promise.reject(new Error("Failed to update meeting"));
      }
    },

    deleteMeeting: async (uid: string): Promise<void> => {
      try {
        log.debug("Deleting Zoom meeting", { uid });

        // Check if uid contains occurrence info (format: meetingId:occurrenceId)
        const { meetingId, occurrenceId } = extractOccurrenceId(uid);

        if (occurrenceId) {
          log.info("Deleting specific occurrence", { meetingId, occurrenceId });
          // Use deleteRecurringInstance for specific occurrence
          return await deleteRecurringInstance(uid);
        }

        // Delete entire meeting/series
        await fetchZoomApi(`meetings/${meetingId}`, {
          method: "DELETE",
        });

        log.info("Zoom meeting deleted successfully", { meetingId });
        return Promise.resolve();
      } catch (err) {
        log.error("Failed to delete meeting", { error: err, uid });
        return Promise.reject(new Error("Failed to delete meeting"));
      }
    },
  };
};

export default ZoomVideoApiAdapter;
