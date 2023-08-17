import { WEBAPP_URL } from "@calcom/lib/constants";
import type { Person } from "@calcom/types/Calendar";
import type { VideoApiAdapterFactory } from "@calcom/types/VideoApiAdapter";

import appConfig from "../config.json";
import { hashAttendee } from "../lib";

const createMeetingUrl = (uid: number, attendee: Person) => {
  return `${WEBAPP_URL}/booking/${uid}/join/${hashAttendee(attendee)}`;
};

const BbbApiAdapter: VideoApiAdapterFactory = () => {
  return {
    createMeeting: async (event) => {
      const [firstAttendee] = event.attendees;
      return {
        type: appConfig.type,
        id: event.uid,
        password: "",
        // FIXME: generate unique link for each attendee or universal link with name form on join page
        url: createMeetingUrl(event.uid, firstAttendee),
      };
    },
    updateMeeting: async (bookingRef, event) => {
      const [firstAttendee] = event.attendees;
      return {
        type: bookingRef.type as string,
        id: event.uid,
        password: bookingRef.meetingPassword as string,
        // FIXME: generate unique link for each attendee or universal link with name form on join page
        url: createMeetingUrl(event.uid, firstAttendee),
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    deleteMeeting: async (): Promise<void> => {},
    getAvailability: async () => [],
  };
};

export default BbbApiAdapter;
