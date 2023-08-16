import { createHash } from "node:crypto";

import { WEBAPP_URL } from "@calcom/lib/constants";
import type { Person } from "@calcom/types/Calendar";
import type { VideoApiAdapterFactory } from "@calcom/types/VideoApiAdapter";

import appConfig from "../config.json";

const createMeetingUrl = (eventUid: number, attendee: Person) => {
  const attendeeHash = createHash("sha256").update(`${attendee.name}${attendee.email}`).digest("hex");
  return `${WEBAPP_URL}/join/${eventUid}/${attendeeHash}`;
};

const BbbApiAdapter: VideoApiAdapterFactory = (credential) => {
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
