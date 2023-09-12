import { z } from "zod";

import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import type { Credential } from "@calcom/prisma/client";
import { Frequency } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import { getZoomAppKeys } from "./getZoomAppKeys";

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

// Successful API response
// @TODO: add link to the docs
const zoomTokenSchema = z.object({
  scope: z.string().regex(new RegExp("meeting:write")),
  expiry_date: z.number(),
  expires_in: z.number().optional(), // deprecated, purely for backwards compatibility; superseeded by expiry_date.
  token_type: z.literal("bearer"),
  access_token: z.string(),
  refresh_token: z.string(),
});

type ZoomToken = z.infer<typeof zoomTokenSchema>;

const isTokenValid = (token: ZoomToken) => (token.expires_in || token.expiry_date) < Date.now();

/** @link https://marketplace.zoom.us/docs/guides/auth/oauth/#request */
const zoomRefreshedTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("bearer"),
  refresh_token: z.string(),
  expires_in: z.number(),
  scope: z.string(),
});

const zoomAuth = (credential: CredentialPayload) => {
  const refreshAccessToken = async (refreshToken: string) => {
    const { client_id, client_secret } = await getZoomAppKeys();
    const authHeader = "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64");

    const response = await fetch("https://zoom.us/oauth/token", {
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

    const responseBody = await handleZoomResponse(response, credential.id);

    if (responseBody.error) {
      if (responseBody.error === "invalid_grant") {
        return Promise.reject(new Error("Invalid grant for Cal.com zoom app"));
      }
    }
    // We check the if the new credentials matches the expected response structure
    const parsedToken = zoomRefreshedTokenSchema.safeParse(responseBody);

    // TODO: If the new token is invalid, initiate the fallback sequence instead of throwing
    // Expanding on this we can use server-to-server app and create meeting from admin calcom account
    if (!parsedToken.success) {
      return Promise.reject(new Error("Invalid refreshed tokens were returned"));
    }
    const newTokens = parsedToken.data;
    const oldCredential = await prisma.credential.findUniqueOrThrow({ where: { id: credential.id } });
    const parsedKey = zoomTokenSchema.safeParse(oldCredential.key);
    if (!parsedKey.success) {
      return Promise.reject(new Error("Invalid credentials were saved in the DB"));
    }

    const key = parsedKey.data;
    key.access_token = newTokens.access_token;
    key.refresh_token = newTokens.refresh_token;
    // set expiry date as offset from current time.
    key.expiry_date = Math.round(Date.now() + newTokens.expires_in * 1000);
    // Store new tokens in database.
    await prisma.credential.update({ where: { id: credential.id }, data: { key } });
    return newTokens.access_token;
  };

  return {
    getToken: async () => {
      let credentialKey: ZoomToken | null = null;
      try {
        credentialKey = zoomTokenSchema.parse(credential.key);
      } catch (error) {
        return Promise.reject("Zoom credential keys parsing error");
      }

      return !isTokenValid(credentialKey)
        ? Promise.resolve(credentialKey.access_token)
        : refreshAccessToken(credentialKey.refresh_token);
    },
  };
};

type ZoomRecurrence = {
  end_date_time?: string;
  type: 1 | 2 | 3;
  end_times?: number;
  repeat_interval?: number;
  weekly_days?: number; // 1-7 Sunday = 1, Saturday = 7
  monthly_day?: number; // 1-31
};

const ZoomVideoApiAdapter = (credential: CredentialPayload): VideoApiAdapter => {
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
    const auth = zoomAuth(credential);
    const accessToken = await auth.getToken();
    const response = await fetch(`https://api.zoom.us/v2/${endpoint}`, {
      method: "GET",
      ...options,
      headers: {
        Authorization: "Bearer " + accessToken,
        ...options?.headers,
      },
    });
    const responseBody = await handleZoomResponse(response, credential.id);
    return responseBody;
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
        if (response.error) {
          if (response.error === "invalid_grant") {
            await invalidateCredential(credential.id);
            return Promise.reject(new Error("Invalid grant for Cal.com zoom app"));
          }
        }

        const result = zoomEventResultSchema.parse(response);

        if (result.id && result.join_url) {
          return {
            type: "zoom_video",
            id: result.id.toString(),
            password: result.password || "",
            url: result.join_url,
          };
        }
        throw new Error("Failed to create meeting. Response is " + JSON.stringify(result));
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
        return Promise.reject(new Error("Failed to update meeting"));
      }
    },
  };
};

const handleZoomResponse = async (response: Response, credentialId: Credential["id"]) => {
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
  // handle 204 response code with empty response (causes crash otherwise as "" is invalid JSON)
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

export default ZoomVideoApiAdapter;
