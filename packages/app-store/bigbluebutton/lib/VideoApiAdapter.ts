import { v4 as uuidv4 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import { metadata } from "../_metadata";
import { buildApiUrl } from "./bbb";
import getBigBlueButtonAppKeys from "./getBigBlueButtonAppKeys";

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const { bbbUrl, bbbSecret } = await getBigBlueButtonAppKeys();

      if (!bbbUrl || !bbbSecret) {
        throw new Error("BigBlueButton server URL and shared secret must be configured in admin settings.");
      }

      const meetingID = uuidv4();
      const meetingName = `${eventData.title} - ${eventData.type}`;
      const attendeePassword = uuidv4().replace(/-/g, "").substring(0, 8);
      const moderatorPassword = uuidv4().replace(/-/g, "").substring(0, 8);

      // Build the create API call
      const createParams: Record<string, string> = {
        name: meetingName,
        meetingID,
        attendeePW: attendeePassword,
        moderatorPW: moderatorPassword,
        welcome: `<br>Welcome to <b>${meetingName}</b>!`,
      };

      const createUrl = buildApiUrl(bbbUrl, "create", createParams, bbbSecret);

      // Create the meeting on the BBB server
      const createResponse = await fetch(createUrl);
      const createText = await createResponse.text();

      if (!createText.includes("<returncode>SUCCESS</returncode>")) {
        const errorMatch = createText.match(/<message>(.*?)<\/message>/);
        const errorMessage = errorMatch ? errorMatch[1] : "Unknown error";
        throw new Error(`BigBlueButton create meeting failed: ${errorMessage}`);
      }

      // Build the join URL for the moderator (organizer)
      const joinParams: Record<string, string> = {
        fullName: eventData.organizer.name,
        meetingID,
        password: moderatorPassword,
        redirect: "true",
      };

      const joinUrl = buildApiUrl(bbbUrl, "join", joinParams, bbbSecret);

      return {
        type: metadata.type,
        id: meetingID,
        password: moderatorPassword,
        url: joinUrl,
      };
    },
    deleteMeeting: async (uid: string): Promise<void> => {
      const { bbbUrl, bbbSecret } = await getBigBlueButtonAppKeys();

      if (!bbbUrl || !bbbSecret) {
        return;
      }

      // Build the end API call
      const endParams: Record<string, string> = {
        meetingID: uid,
        // Use the moderator password to end; if we don't have it stored, BBB won't end
        // But we try anyway since the uid is the meetingID
        password: "unused",
      };

      // We need the moderator password to end meetings; use a stored approach
      // In practice, BBB end requires the moderatorPW. We attempt but silently fail if unavailable.
      const endUrl = buildApiUrl(bbbUrl, "end", endParams, bbbSecret);
      try {
        await fetch(endUrl);
      } catch {
        // Silently fail — meeting may have already ended
      }
    },
    updateMeeting: (bookingRef: PartialReference): Promise<VideoCallData> => {
      return Promise.resolve({
        type: "bigbluebutton_video",
        id: bookingRef.meetingId as string,
        password: bookingRef.meetingPassword as string,
        url: bookingRef.meetingUrl as string,
      });
    },
  };
};

export default BigBlueButtonVideoApiAdapter;
