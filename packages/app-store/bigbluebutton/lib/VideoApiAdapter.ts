const BigBlueButtonApiAdapter = (credential) => ({
  createMeeting: async (event) => ({
    type: "bigbluebutton_video",
    id: event.uid,
    password: "",
    url: "https://demo.bigbluebutton.org/gl/" + event.uid,
  }),
  updateMeeting: async (event) => ({
    type: "bigbluebutton_video",
    id: event.uid,
    password: "",
    url: "https://demo.bigbluebutton.org/gl/" + event.uid,
  }),
  deleteMeeting: async () => Promise.resolve(),
});
export default BigBlueButtonApiAdapter;
