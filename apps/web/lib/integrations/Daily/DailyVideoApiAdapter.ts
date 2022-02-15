import { Credential } from "@prisma/client";

import { BASE_URL } from "@lib/config/constants";
import { handleErrorsJson } from "@lib/errors";
import { PartialReference } from "@lib/events/EventManager";
import prisma from "@lib/prisma";
import { VideoApiAdapter, VideoCallData } from "@lib/videoClient";

import { CalendarEvent } from "../calendar/interfaces/Calendar";

export interface DailyReturnType {
  /** Long UID string ie: 987b5eb5-d116-4a4e-8e2c-14fcb5710966 */
  id: string;
  /** Not a real name, just a random generated string ie: "ePR84NQ1bPigp79dDezz" */
  name: string;
  api_created: boolean;
  privacy: "private" | "public";
  /** https://api-demo.daily.co/ePR84NQ1bPigp79dDezz */
  url: string;
  created_at: string;
  config: {
    nbf: number;
    exp: number;
    enable_chat: boolean;
    enable_knocking: boolean;
    enable_prejoin_ui: boolean;
    enable_new_call_ui: boolean;
  };
}

export interface DailyEventResult {
  id: string;
  name: string;
  api_created: boolean;
  privacy: string;
  url: string;
  created_at: string;
  config: Record<string, unknown>;
}

export interface DailyVideoCallData {
  type: string;
  id: string;
  password: string;
  url: string;
}

type DailyKey = {
  apikey: string;
};

export const FAKE_DAILY_CREDENTIAL: Credential = {
  id: +new Date().getTime(),
  type: "daily_video",
  key: { apikey: process.env.DAILY_API_KEY },
  userId: +new Date().getTime(),
};

const DailyVideoApiAdapter = (credential: Credential): VideoApiAdapter => {
  const dailyApiToken = (credential.key as DailyKey).apikey;

  function postToDailyAPI(endpoint: string, body: Record<string, any>) {
    return fetch("https://api.daily.co/v1" + endpoint, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + dailyApiToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  async function createOrUpdateMeeting(endpoint: string, event: CalendarEvent): Promise<VideoCallData> {
    if (!event.uid) {
      throw new Error("We need need the booking uid to create the Daily reference in DB");
    }
    const response = await postToDailyAPI(endpoint, translateEvent(event));
    const dailyEvent: DailyReturnType = await handleErrorsJson(response);
    const res = await postToDailyAPI("/meeting-tokens", {
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
      url: BASE_URL + "/video/" + event.uid,
    });
  }

  const translateEvent = (event: CalendarEvent) => {
    // Documentation at: https://docs.daily.co/reference#list-rooms
    // added a 1 hour buffer for room expiration and room entry
    const exp = Math.round(new Date(event.endTime).getTime() / 1000) + 60 * 60;
    const nbf = Math.round(new Date(event.startTime).getTime() / 1000) - 60 * 60;
    const scalePlan = process.env.DAILY_SCALE_PLAN;

    if (scalePlan === "true") {
      return {
        privacy: "public",
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
      privacy: "public",
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
  };

  return {
    /** Daily doesn't need to return busy times, so we return empty */
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> =>
      createOrUpdateMeeting("/rooms", event),
    deleteMeeting: async (uid: string): Promise<void> => {
      await fetch("https://api.daily.co/v1/rooms/" + uid, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + dailyApiToken,
        },
      }).then(handleErrorsJson);

      return Promise.resolve();
    },
    updateMeeting: (bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> =>
      createOrUpdateMeeting("/rooms/" + bookingRef.uid, event),
  };
};

export default DailyVideoApiAdapter;
