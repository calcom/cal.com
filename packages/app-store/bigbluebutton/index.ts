// @ts-nocheck
export * as apiHandlers from "./api";

const BigBlueButtonApiAdapter = {
  getAvailability: () => Promise.resolve([]),
  createMeeting: async (event) => ({
    type: "bigbluebutton_video",
    id: event.uid,
    password: "",
    url: "https://demo.bigbluebutton.org/gl/" + event.uid,
  }),
  deleteMeeting: async () => Promise.resolve(),
  updateMeeting: async (event) => ({
    type: "bigbluebutton_video",
    id: event.uid,
    password: "",
    url: "https://demo.bigbluebutton.org/gl/" + event.uid,
  }),
};
export default BigBlueButtonApiAdapter;
