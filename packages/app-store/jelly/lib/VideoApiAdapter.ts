import type { CalendarEvent, EventBusyDate } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

type JellyToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
};
const JellyVideoApiAdapter = (credential: CredentialPayload): VideoApiAdapter => {
  return {
    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      // get keys from slug
      const keys = credential.key as JellyToken;
      console.log("jelly API keys: ", keys);
      const { access_token } = keys;
      console.log("jelly access token: ", access_token);
      // create jelly link
      const jellyLink = await fetch("https://www.jellyjelly.com/api/ti/start_jelly", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      });
      const jellyLinkData = await jellyLink.json();
      console.log("jelly API response: ", jellyLinkData, jellyLink);

      return {
        type: "jelly_conferencing",
        id: jellyLinkData.talkId,
        password: "",
        url: jellyLinkData.url,
      };
    },
    updateMeeting: async (bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> => {
      // don't update jelly link
      return {
        type: "jelly_conferencing",
        id: bookingRef.externalCalendarId ? bookingRef.externalCalendarId : "",
        password: "",
        url: bookingRef.meetingUrl ? bookingRef.meetingUrl : "",
      };
    },
    deleteMeeting: async (uid: string): Promise<unknown> => {
      // delete jelly link
      return {};
    },
    getAvailability: async (dateFrom?: string, dateTo?: string): Promise<EventBusyDate[]> => {
      // get jelly availability
      return [];
    },
  };
};

export default JellyVideoApiAdapter;
