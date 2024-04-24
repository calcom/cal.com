import { z } from "zod";

import dayjs from "@calcom/dayjs";
import {
  APP_CREDENTIAL_SHARING_ENABLED,
  CREDENTIAL_SYNC_ENDPOINT,
  CREDENTIAL_SYNC_SECRET,
  CREDENTIAL_SYNC_SECRET_HEADER_NAME,
} from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
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

type ZoomRecurrence = {
  end_date_time?: string;
  type: 1 | 2 | 3;
  end_times?: number;
  repeat_interval?: number;
  weekly_days?: number; // 1-7 Sunday = 1, Saturday = 7
  monthly_day?: number; // 1-31
};

const ZoomVideoApiAdapter = (credential: CredentialPayload): VideoApiAdapter => {
  const tokenResponse = getTokenObjectFromCredential(credential);

  const translateEvent = (event: CalendarEvent) => {
    const getRecurrence = ({
      recurringEvent,
      startTime,
      attendees,
    }: CalendarEvent): { recurrence: ZoomRecurrence; type: 8 } | undefined => {
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
          // Zoom does not support YEARLY, HOURLY or MINUTELY frequencies, don't do anything in those cases.
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
        type: 8,
      };
    };

    const recurrence = getRecurrence(event);
    // Documentation at: https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingcreate
    return {
      topic: event.title,
      type: 2, // Means that this is a scheduled meeting
      start_time: dayjs(event.startTime).utc().format(),
      duration: (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 60000,
      //schedule_for: "string",   TODO: Used when scheduling the meeting for someone else (needed?)
      timezone: event.organizer.timeZone,
      //password: "string",       TODO: Should we use a password? Maybe generate a random one?
      agenda: event.description,
      settings: {
        host_video: true,
        participant_video: true,
        cn_meeting: false, // TODO: true if host meeting in China
        in_meeting: false, // TODO: true if host meeting in India
        join_before_host: true,
        mute_upon_entry: false,
        watermark: false,
        use_pmi: false,
        approval_type: 2,
        audio: "both",
        auto_recording: "none",
        enforce_login: false,
        registrants_email_notification: true,
      },
      ...recurrence,
    };
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
        myLog.debug(safeStringify({ status: response.status, ok: response.ok }));
        if (!response.ok || (response.status < 200 && response.status >= 300)) {
          const responseBody = await response.json();
          myLog.debug(safeStringify({ responseBody }));

          if (responseBody.error === "invalid_grant") {
            return { reason: responseBody.error };
          }
        }
        return null;
      },
      isAccessTokenUnusable: async function (response) {
        const myLog = logger.getSubLogger({ prefix: ["zoomvideo:isAccessTokenUnusable"] });
        myLog.debug(safeStringify({ status: response.status, ok: response.ok }));
        if (!response.ok || (response.status < 200 && response.status >= 300)) {
          const responseBody = await response.json();
          myLog.debug(safeStringify({ responseBody }));

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
        console.error(err);
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
          body: JSON.stringify(translateEvent(event)),
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
        console.error(err);
        /* Prevents meeting creation failure when Zoom Token is expired */
        throw new Error("Unexpected error");
      }
    },
    deleteMeeting: async (uid: string): Promise<void> => {
      try {
        await fetchZoomApi(`meetings/${uid}`, {
          method: "DELETE",
        });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(new Error("Failed to delete meeting"));
      }
    },
    updateMeeting: async (bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> => {
      try {
        await fetchZoomApi(`meetings/${bookingRef.uid}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(translateEvent(event)),
        });

        return Promise.resolve({
          type: "zoom_video",
          id: bookingRef.meetingId as string,
          password: bookingRef.meetingPassword as string,
          url: bookingRef.meetingUrl as string,
        });
      } catch (err) {
        log.error("Failed to update meeting", safeStringify(err));
        return Promise.reject(new Error("Failed to update meeting"));
      }
    },
  };
};

export default ZoomVideoApiAdapter;
