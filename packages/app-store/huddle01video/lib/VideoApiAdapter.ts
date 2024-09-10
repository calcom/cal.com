import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { VideoApiAdapter } from "@calcom/types/VideoApiAdapter";

import { getHuddle01APIKey, getHuddle01Credential } from "../utils/storage";

const API_END_POINT = "https://platform-api-darshan.huddle01.workers.dev/api/v2/calendar";

const fetchHuddleAPI = async (userId: number) => {
  const { identityToken } = await getHuddle01Credential(userId);
  const { apiKey } = await getHuddle01APIKey();

  const headers = {
    "x-api-key": apiKey,
    "x-identity-token": identityToken,
  };
  return (endpoint: "subdomains" | "createMeeting", option?: RequestInit) => {
    return fetch(`${API_END_POINT}/${endpoint}`, {
      ...option,
      headers: {
        ...option?.headers,
        ...headers,
      },
    });
  };
};

const log = logger.getSubLogger({ prefix: ["app-store/huddle01video/lib/VideoApiAdapter"] });

const Huddle01ApiAdapter = (credential: CredentialPayload): VideoApiAdapter => {
  credential.userId;
  return {
    createMeeting: async (e: CalendarEvent) => {
      if (!credential.userId) {
        log.error("[Huddle01 Error] -> User is not logged in");
        throw new Error("User is not logged in");
      }

      try {
        const fetch = await fetchHuddleAPI(credential.userId);

        const res = await fetch("createMeeting", {
          method: "POST",
          body: JSON.stringify({ title: e.title, startTime: e.startTime }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = (await res.json()) as {
          roomId: string;
          meetingLink: string;
        };

        console.log("CALLING CREATE MEETING", e);
        return {
          type: "huddle01_video",
          id: data.roomId,
          password: "",
          url: data.meetingLink,
        };
      } catch (e) {
        log.error("[Huddle01 Error] -> Error while creating meeeting", e);
        throw Error("Error while creating meeting");
      }
    },
    updateMeeting: async (bookingRef: PartialReference, event: CalendarEvent) => {
      console.log("UPDATE MEETING", bookingRef, event);
      return {
        type: "huddle01_video",
        id: "",
        password: "",
        url: "",
      };
    },
    deleteMeeting: async (uid: string) => {
      console.log("DELETE MEETING", uid);
      return {
        type: "huddle01_video",
        id: "",
        password: "",
        url: "",
      };
    },
    getAvailability: async () => {
      console.log("GET AVAILABILITY");
      return [];
    },
  };
};

export default Huddle01ApiAdapter;
