import type { VideoApiAdapterFactory } from "@calcom/types/VideoApiAdapter";

/** This is a barebones factory function for a video integration */
const ExampleVideoApiAdapter: VideoApiAdapterFactory = (credential) => {
  return {
    getAvailability: async () => {
      try {
        return [];
      } catch (err) {
        console.error(err);
        return [];
      }
    },
    createMeeting: async (event) => {
      return Promise.resolve({
        type: "example_video",
        id: "",
        password: "",
        url: "",
      });
    },
    deleteMeeting: async (uid) => {
      return Promise.resolve();
    },
    updateMeeting: async (bookingRef, event) => {
      return Promise.resolve({
        type: "example_video",
        id: bookingRef.meetingId as string,
        password: bookingRef.meetingPassword as string,
        url: bookingRef.meetingUrl as string,
      });
    },
  };
};

export default ExampleVideoApiAdapter;
