import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "BigBlueButton",
  description: "BigBlueButton is an open source video conferencing system designed for online learning.",
  installed: true,
  type: "bigbluebutton_video",
  variant: "conferencing", 
  categories: ["conferencing"],
  logo: "icon.svg",
  publisher: "Cal.com",
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
