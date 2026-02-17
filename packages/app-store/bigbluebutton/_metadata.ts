import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "BigBlueButton",
  description:
    "BigBlueButton is a free, open-source web conferencing system designed for online learning. It supports real-time sharing of audio, video, slides, chat, and screen.",
  installed: true,
  type: "bigbluebutton_video",
  variant: "conferencing",
  categories: ["conferencing"],
  logo: "icon.svg",
  publisher: "BigBlueButton Inc.",
  url: "https://bigbluebutton.org/",
  slug: "bigbluebutton",
  title: "BigBlueButton",
  isGlobal: false,
  email: "help@cal.com",
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:bigbluebutton_video",
      label: "BigBlueButton",
    },
  },
  dirName: "bigbluebutton",
  concurrentMeetings: true,
  isOAuth: false,
} as AppMeta;

export default metadata;
