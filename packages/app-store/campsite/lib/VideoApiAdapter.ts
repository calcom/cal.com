import type { CalendarEvent, EventBusyDate } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

type CampsiteToken = {
  access_token: string;
};
const CampsiteVideoApiAdapter = (credential: CredentialPayload): VideoApiAdapter => {
  return {
    createMeeting: async (_event: CalendarEvent): Promise<VideoCallData> => {
      const keys = credential.key as CampsiteToken;
      const { access_token } = keys;
      const response = await fetch("https://api.campsite.co/v1/integrations/cal_dot_com/call_rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      });
      const callRoom = await response.json();

      return {
        type: "campsite_conferencing",
        id: callRoom.id,
        password: "",
        url: callRoom.url,
      };
    },
    updateMeeting: async (bookingRef: PartialReference, _event: CalendarEvent): Promise<VideoCallData> => {
      return {
        type: "campsite_conferencing",
        id: bookingRef.externalCalendarId ? bookingRef.externalCalendarId : "",
        password: "",
        url: bookingRef.meetingUrl ? bookingRef.meetingUrl : "",
      };
    },
    deleteMeeting: async (_uid: string): Promise<unknown> => {
      return {};
    },
    getAvailability: async (_dateFrom?: string, _dateTo?: string): Promise<EventBusyDate[]> => {
      return [];
    },
  };
};

export default CampsiteVideoApiAdapter;
