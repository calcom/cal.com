import { Credential } from "@prisma/client";

import { handleErrorsJson, handleErrorsRaw } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/CalendarEvent";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

/** @link https://docs.microsoft.com/en-us/graph/api/application-post-onlinemeetings?view=graph-rest-1.0&tabs=http#response */
export interface TeamsEventResult {
  audioConferencing: {
    tollNumber: string;
    tollFreeNumber: string;
    ConferenceId: string;
    dialinUrl: string;
  };
  creationDateTime: string;
  startDateTime: string;
  endDateTime: string;
  id: string;
  joinWebUrl: string;
  subject: string;
}

interface ZoomToken {
  scope: "meeting:write";
  expiry_date: number;
  expires_in?: number; // deprecated, purely for backwards compatibility; superseeded by expiry_date.
  token_type: "bearer";
  access_token: string;
  refresh_token: string;
}

const zoomAuth = (credential: Credential) => {
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

const TeamsVideoApiAdapter = (credential: Credential): VideoApiAdapter => {
  const translateEvent = (event: CalendarEvent) => {
    // Documentation at: https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingcreate
    return {
      subject: event.title,
      stateDateTime: event.startTime,
      endDateTime: event.endTime,
    //   duration: (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 60000,
    //   //schedule_for: "string",   TODO: Used when scheduling the meeting for someone else (needed?)
    //   timezone: event.attendees[0].timeZone,
    //   //password: "string",       TODO: Should we use a password? Maybe generate a random one?
    //   agenda: event.description,
    //   settings: {
    //     host_video: true,
    //     participant_video: true,
    //     cn_meeting: false, // TODO: true if host meeting in China
    //     in_meeting: false, // TODO: true if host meeting in India
    //     join_before_host: true,
    //     mute_upon_entry: false,
    //     watermark: false,
    //     use_pmi: false,
    //     approval_type: 2,
    //     audio: "both",
    //     auto_recording: "none",
    //     enforce_login: false,
    //     registrants_email_notification: true,
    //   },
    };
  };

  return {
    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      await fetch("https://graph.microsoft.com/v1.0/me/onlineMeetings", {
        method: "POST",
        headers: {
          // Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(translateEvent(event)),
      }).then(handleErrorsRaw);

      return Promise.resolve({
        type: "zoom_video",
        id: bookingRef.meetingId as string,
        password: bookingRef.meetingPassword as string,
        url: bookingRef.meetingUrl as string,
      });
  }
};

export default ZoomVideoApiAdapter;
