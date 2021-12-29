import { Credential } from "@prisma/client";

import { handleErrorsJson, handleErrorsRaw } from "@lib/errors";
import { PartialReference } from "@lib/events/EventManager";
import { CalendarEvent } from "@lib/integrations/calendar/interfaces/Calendar";
import { VIDEO_CONFERENCING_INTEGRATIONS_TYPES } from "@lib/integrations/videoConferencing/constants/generals";
import { VideoCallData, ZoomToken } from "@lib/integrations/videoConferencing/interfaces/VideoConferencing";
import BaseVideoConferencingService from "@lib/integrations/videoConferencing/services/BaseVideoConferencingService";
import prisma from "@lib/prisma";

export default class ZoomVideoConferencingService extends BaseVideoConferencingService {
  private auth;

  constructor(credential: Credential) {
    super(credential, VIDEO_CONFERENCING_INTEGRATIONS_TYPES.zoom);

    this.auth = this.zoomAuth(credential);
  }

  private zoomAuth = (credential: Credential) => {
    const credentialKey = credential.key as unknown as ZoomToken;
    const isTokenValid = (token: ZoomToken) =>
      token && token.token_type && token.access_token && (token.expires_in || token.expiry_date) < Date.now();
    const authHeader =
      "Basic " +
      Buffer.from(process.env.ZOOM_CLIENT_ID + ":" + process.env.ZOOM_CLIENT_SECRET).toString("base64");

    const refreshAccessToken = (refreshToken: string) =>
      fetch("https://zoom.us/oauth/token", {
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

    return {
      getToken: () =>
        !isTokenValid(credentialKey)
          ? Promise.resolve(credentialKey.access_token)
          : refreshAccessToken(credentialKey.refresh_token),
    };
  };

  private translateEvent = (event: CalendarEvent) => {
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

  async createMeeting(event: CalendarEvent): Promise<VideoCallData> {
    const accessToken = await this.auth.getToken();

    const result = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(this.translateEvent(event)),
    }).then(handleErrorsJson);

    return Promise.resolve({
      type: VIDEO_CONFERENCING_INTEGRATIONS_TYPES.zoom,
      id: result.id as string,
      password: result.password ?? "",
      url: result.join_url,
    });
  }

  async updateMeeting(bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> {
    const accessToken = await this.auth.getToken();

    await fetch("https://api.zoom.us/v2/meetings/" + bookingRef.uid, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(this.translateEvent(event)),
    }).then(handleErrorsRaw);

    return Promise.resolve({
      type: VIDEO_CONFERENCING_INTEGRATIONS_TYPES.zoom,
      id: bookingRef.meetingId as string,
      password: bookingRef.meetingPassword as string,
      url: bookingRef.meetingUrl as string,
    });
  }

  async deleteMeeting(uid: string): Promise<void> {
    const accessToken = await this.auth.getToken();

    await fetch("https://api.zoom.us/v2/meetings/" + uid, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + accessToken,
      },
    }).then(handleErrorsRaw);

    return Promise.resolve();
  }

  async getAvailability() {
    return this.auth
      .getToken()
      .then(
        // TODO Possibly implement pagination for cases when there are more than 300 meetings already scheduled.
        (accessToken) =>
          fetch("https://api.zoom.us/v2/users/me/meetings?type=scheduled&page_size=300", {
            method: "get",
            headers: {
              Authorization: "Bearer " + accessToken,
            },
          })
            .then(handleErrorsJson)
            .then((responseBody) => {
              return responseBody.meetings.map((meeting: { start_time: string; duration: number }) => ({
                start: meeting.start_time,
                end: new Date(
                  new Date(meeting.start_time).getTime() + meeting.duration * 60000
                ).toISOString(),
              }));
            })
      )
      .catch((err) => {
        console.error(err);
        /* Prevents booking failure when Zoom Token is expired */
        return [];
      });
  }
}
