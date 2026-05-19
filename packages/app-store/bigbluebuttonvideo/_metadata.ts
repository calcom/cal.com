import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "BigBlueButton",
  description:
    "BigBlueButton is an open-source web conferencing system designed for online learning. Host meetings on your own server with full control over data and privacy.",
  installed: true,
  type: "bigbluebutton_video",
  variant: "conferencing",
  categories: ["conferencing"],
  logo: "icon.svg",
  publisher: "Cal.diy",
  url: "https://bigbluebutton.org/",
  slug: "bigbluebutton",
  title: "BigBlueButton",
  isGlobal: false,
  email: "help@cal.com",
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:bigbluebutton",
      label: "BigBlueButton",
    },
  },
  dirName: "bigbluebuttonvideo",
  concurrentMeetings: true,
  isOAuth: false,
} as AppMeta;

export default metadata;
