const BigBlueButtonApiAdapter = (credential) => ({
  createMeeting: async (event) => ({
    type: "bigbluebutton_video",
    id: event.uid,
    password: "",
    url: `${credential?.key?.serverUrl ?? "https://demo.bigbluebutton.org/gl"}/${event.uid}`,
  }),
  updateMeeting: async (_bookingRef, event) => ({
    type: "bigbluebutton_video",
    id: event.uid,
    password: "",
    url: `${credential?.key?.serverUrl ?? "https://demo.bigbluebutton.org/gl"}/${event.uid}`,
  }),
  deleteMeeting: async () => Promise.resolve(),
});
export default BigBlueButtonApiAdapter;
