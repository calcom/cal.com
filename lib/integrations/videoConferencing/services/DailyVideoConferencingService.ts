import { Credential } from "@prisma/client";

import { BASE_URL } from "@lib/config/constants";
import { handleErrorsJson } from "@lib/errors";
import { PartialReference } from "@lib/events/EventManager";
import { CalendarEvent } from "@lib/integrations/calendar/interfaces/Calendar";
import { VIDEO_CONFERENCING_INTEGRATIONS_TYPES } from "@lib/integrations/videoConferencing/constants/generals";
import {
  DailyKey,
  DailyReturnType,
  VideoCallData,
} from "@lib/integrations/videoConferencing/interfaces/VideoConferencing";
import BaseVideoConferencingService from "@lib/integrations/videoConferencing/services/BaseVideoConferencingService";
import prisma from "@lib/prisma";

export default class DailyVideoConferencingService extends BaseVideoConferencingService {
  private dailyApiToken = "";

  constructor(credential: Credential) {
    super(credential, VIDEO_CONFERENCING_INTEGRATIONS_TYPES.daily);

    this.dailyApiToken = (credential.key as DailyKey).apikey;
  }

  private async postToDailyAPI(endpoint: string, body: Record<string, any>) {
    return fetch("https://api.daily.co/v1" + endpoint, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.dailyApiToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  private translateEvent(event: CalendarEvent) {
    // Documentation at: https://docs.daily.co/reference#list-rooms
    // added a 1 hour buffer for room expiration and room entry
    const exp = Math.round(new Date(event.endTime).getTime() / 1000) + 60 * 60;
    const nbf = Math.round(new Date(event.startTime).getTime() / 1000) - 60 * 60;
    const scalePlan = process.env.DAILY_SCALE_PLAN;

    if (scalePlan === "true") {
      return {
        privacy: "private",
        properties: {
          enable_new_call_ui: true,
          enable_prejoin_ui: true,
          enable_knocking: true,
          enable_screenshare: true,
          enable_chat: true,
          exp: exp,
          nbf: nbf,
          enable_recording: "local",
        },
      };
    }
    return {
      privacy: "private",
      properties: {
        enable_new_call_ui: true,
        enable_prejoin_ui: true,
        enable_knocking: true,
        enable_screenshare: true,
        enable_chat: true,
        exp: exp,
        nbf: nbf,
      },
    };
  }

  private async createOrUpdateMeeting(endpoint: string, event: CalendarEvent): Promise<VideoCallData> {
    if (!event.uid) {
      throw new Error("We need need the booking uid to create the Daily reference in DB");
    }
    const response = await this.postToDailyAPI(endpoint, this.translateEvent(event));
    const dailyEvent: DailyReturnType = await handleErrorsJson(response);
    const res = await this.postToDailyAPI("/meeting-tokens", {
      properties: { room_name: dailyEvent.name, is_owner: true },
    });
    const meetingToken: { token: string } = await handleErrorsJson(res);
    await prisma.dailyEventReference.create({
      data: {
        dailyurl: dailyEvent.url,
        dailytoken: meetingToken.token,
        booking: {
          connect: {
            uid: event.uid,
          },
        },
      },
    });

    return Promise.resolve({
      type: "daily_video",
      id: dailyEvent.name,
      password: "",
      url: BASE_URL + "/call/" + event.uid,
    });
  }

  async createMeeting(event: CalendarEvent): Promise<VideoCallData> {
    return this.createOrUpdateMeeting("/rooms", event);
  }

  async updateMeeting(bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> {
    return this.createOrUpdateMeeting("/rooms/" + bookingRef.uid, event);
  }

  async deleteMeeting(uid: string): Promise<void> {
    await fetch("https://api.daily.co/v1/rooms/" + uid, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + this.dailyApiToken,
      },
    }).then(handleErrorsJson);

    return Promise.resolve();
  }

  async getAvailability() {
    return Promise.resolve([]);
  }
}
