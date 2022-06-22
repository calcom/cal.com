import { Credential } from "@prisma/client";
import { z } from "zod";

import { handleErrorsJson } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import { getZoomAppKeys } from "./getZoomAppKeys";

/** @link https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingcreate */
export const zoomEventResultSchema = z
  .object({
    assistant_id: z.string(),
    host_email: z.string(),
    id: z.number(),
    registration_url: z.string(),
    agenda: z.string(),
    created_at: z.string(),
    duration: z.number(),
    h323_password: z.string(),
    join_url: z.string(),
    occurrences: z.array(
      z.object({
        duration: z.number(),
        occurrence_id: z.string(),
        start_time: z.string(),
        status: z.string(),
      })
    ),
    password: z.string(),
    pmi: z.number(),
    pre_schedule: z.boolean(),
    recurrence: z.object({
      end_date_time: z.string(),
      end_times: z.number(),
      monthly_day: z.number(),
      monthly_week: z.number(),
      monthly_week_day: z.number(),
      repeat_interval: z.number(),
      type: z.number(),
      weekly_days: z.string(),
    }),
    settings: z.object({
      allow_multiple_devices: z.boolean(),
      alternative_hosts: z.string(),
      alternative_hosts_email_notification: z.boolean(),
      alternative_host_update_polls: z.boolean(),
      approval_type: z.number(),
      approved_or_denied_countries_or_regions: z.object({
        approved_list: z.array(z.string()),
        denied_list: z.array(z.string()),
        enable: z.boolean(),
        method: z.string(),
      }),
      audio: z.string(),
      authentication_domains: z.string(),
      authentication_exception: z.array(
        z.object({ email: z.string(), name: z.string(), join_url: z.string() })
      ),
      authentication_name: z.string(),
      authentication_option: z.string(),
      auto_recording: z.string(),
      breakout_room: z.object({
        enable: z.boolean(),
        rooms: z.array(z.object({ name: z.string(), participants: z.array(z.string()) })),
      }),
      calendar_type: z.number(),
      close_registration: z.boolean(),
      cn_meeting: z.boolean(),
      contact_email: z.string(),
      contact_name: z.string(),
      custom_keys: z.array(z.object({ key: z.string(), value: z.string() })),
      email_notification: z.boolean(),
      encryption_type: z.string(),
      enforce_login: z.boolean(),
      enforce_login_domains: z.string(),
      focus_mode: z.boolean(),
      global_dial_in_countries: z.array(z.string()),
      global_dial_in_numbers: z.array(
        z.object({
          city: z.string(),
          country: z.string(),
          country_name: z.string(),
          number: z.string(),
          type: z.string(),
        })
      ),
      host_video: z.boolean(),
      in_meeting: z.boolean(),
      jbh_time: z.number(),
      join_before_host: z.boolean(),
      language_interpretation: z.object({
        enable: z.boolean(),
        interpreters: z.array(z.object({ email: z.string(), languages: z.string() })),
      }),
      meeting_authentication: z.boolean(),
      mute_upon_entry: z.boolean(),
      participant_video: z.boolean(),
      private_meeting: z.boolean(),
      registrants_confirmation_email: z.boolean(),
      registrants_email_notification: z.boolean(),
      registration_type: z.number(),
      show_share_button: z.boolean(),
      use_pmi: z.boolean(),
      waiting_room: z.boolean(),
      watermark: z.boolean(),
      host_save_video_order: z.boolean(),
    }),
    start_time: z.string(),
    start_url: z.string(),
    timezone: z.string(),
    topic: z.string(),
    tracking_fields: z.array(z.object({ field: z.string(), value: z.string(), visible: z.boolean() })),
    type: z.number(),
  })
  .deepPartial();

export type ZoomEventResult = z.infer<typeof zoomEventResultSchema>;

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

const zoomTokenSchema = z.object({
  scope: z.string().regex(new RegExp("meeting:write")),
  expiry_date: z.number(),
  expires_in: z.number().optional(), // deprecated, purely for backwards compatibility; superseeded by expiry_date.
  token_type: z.literal("bearer"),
  access_token: z.string(),
  refresh_token: z.string(),
});

type ZoomToken = z.infer<typeof zoomTokenSchema>;

const zoomAuth = (credential: Credential) => {
  const credentialKey = zoomTokenSchema.parse(credential.key);

  const isTokenValid = (token: ZoomToken) =>
    token && token.token_type && token.access_token && (token.expires_in || token.expiry_date) < Date.now();

  const refreshAccessToken = async (refreshToken: string) => {
    const { client_id, client_secret } = await getZoomAppKeys();
    const authHeader = "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64");
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
    })
      .then(handleErrorsJson)
      .then(async (responseBody) => {
        // set expiry date as offset from current time.
        responseBody.expiry_date = Math.round(Date.now() + responseBody.expires_in * 1000);
        delete responseBody.expires_in;
        // Store new tokens in database.
        await prisma.credential.update({
          where: {
            id: credential.id,
          },
          data: {
            key: responseBody,
          },
        });
        credentialKey.expiry_date = responseBody.expiry_date;
        credentialKey.access_token = responseBody.access_token;
        return credentialKey.access_token;
      });
  };

  return {
    getToken: () =>
      !isTokenValid(credentialKey)
        ? Promise.resolve(credentialKey.access_token)
        : refreshAccessToken(credentialKey.refresh_token),
  };
};

const ZoomVideoApiAdapter = (credential: Credential): VideoApiAdapter => {
  const translateEvent = (event: CalendarEvent) => {
    // Documentation at: https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingcreate
    return {
      topic: event.title,
      type: 2, // Means that this is a scheduled meeting
      start_time: event.startTime,
      duration: (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 60000,
      //schedule_for: "string",   TODO: Used when scheduling the meeting for someone else (needed?)
      timezone: event.attendees[0].timeZone,
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
    };
  };

  const fetchZoomApi = async (endpoint: string, options?: RequestInit) => {
    const auth = zoomAuth(credential);
    const accessToken = await auth.getToken();
    const responseBody = await fetch(`https://api.zoom.us/v2/${endpoint}`, {
      method: "GET",
      ...options,
      headers: {
        Authorization: "Bearer " + accessToken,
        ...options?.headers,
      },
    }).then(handleErrorsJson);

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
      const response: ZoomEventResult = await fetchZoomApi("users/me/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(translateEvent(event)),
      });

      const result = zoomEventResultSchema.passthrough().parse(response);
      if (result.id && result.join_url) {
        return Promise.resolve({
          type: "zoom_video",
          id: result.id.toString(),
          password: result.password || "",
          url: result.join_url,
        });
      }
      return Promise.reject(new Error("Failed to create meeting"));
    },
    deleteMeeting: async (uid: string): Promise<void> => {
      await fetchZoomApi(`meetings/${uid}`, {
        method: "DELETE",
      });

      return Promise.resolve();
    },
    updateMeeting: async (bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> => {
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
    },
  };
};

export default ZoomVideoApiAdapter;
