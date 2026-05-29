import { v4 as uuidv4 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import { getBigBlueButtonAppKeys } from "./getBigBlueButtonAppKeys";
import { buildApiUrl } from "./bbb";

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const { bbbUrl, bbbSecret } = await getBigBlueButtonAppKeys();

      const meetingID = uuidv4();
      const name = eventData.title || "Cal.com Meeting";
      const attendeePW = uuidv4().slice(0, 8);
      const moderatorPW = uuidv4().slice(0, 8);

      // Call BBB create API to provision the meeting on the server
      const createUrl = buildApiUrl(
        bbbUrl,
        "create",
        {
          meetingID,
          name,
          attendeePW,
          moderatorPW,
        },
        bbbSecret
      );

      const res = await fetch(createUrl);
      if (!res.ok) {
        throw new Error(`BigBlueButton server returned status ${res.status}`);
      }

      const xmlText = await res.text();
      if (!xmlText.includes("<returncode>SUCCESS</returncode>")) {
        const messageMatch = xmlText.match(/<message>([^<]+)<\/message>/);
        const errorMessage = messageMatch ? messageMatch[1] : "Unknown error during meeting creation";
        throw new Error(`BigBlueButton meeting creation failed: ${errorMessage}`);
      }

      // Generate a signed join URL with redirect=true to return as the meeting URL
      const joinUrl = buildApiUrl(
        bbbUrl,
        "join",
        {
          meetingID,
          fullName: eventData.organizer.name || "Host",
          password: moderatorPW,
          redirect: "true",
        },
        bbbSecret
      );

      return {
        type: "bigbluebutton_video",
        id: meetingID,
        password: moderatorPW,
        url: joinUrl,
      };
    },
    deleteMeeting: async (uid: string): Promise<unknown> => {
      const { bbbUrl, bbbSecret } = await getBigBlueButtonAppKeys();

      const endUrl = buildApiUrl(
        bbbUrl,
        "end",
        {
          meetingID: uid,
        },
        bbbSecret
      );

      const res = await fetch(endUrl);
      if (!res.ok) {
        throw new Error(`BigBlueButton server returned status ${res.status}`);
      }

      return {};
    },
    updateMeeting: async (bookingRef: PartialReference): Promise<VideoCallData> => {
      return {
        type: "bigbluebutton_video",
        id: bookingRef.meetingId as string,
        password: bookingRef.meetingPassword as string,
        url: bookingRef.meetingUrl as string,
      };
    },
  };
};

export default BigBlueButtonVideoApiAdapter;
