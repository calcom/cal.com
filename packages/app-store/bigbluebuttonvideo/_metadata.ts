import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  linkType: "dynamic",
  name: "BigBlueButton",
  description:
    "BigBlueButton is an open-source web conferencing system for online learning. It provides real-time sharing of audio, video, slides, chat, and screen, and is designed for online classrooms with features like breakout rooms, polls, and whiteboard.",
  type: "bigbluebutton_video",
  categories: ["conferencing"],
  variant: "conferencing",
  logo: "icon.svg",
  publisher: "Cal.com",
  url: "https://bigbluebutton.org/",
  category: "conferencing",
  slug: "bigbluebutton",
  title: "BigBlueButton",
  email: "help@cal.com",
  appData: {
    location: {
      default: false,
      linkType: "dynamic",
      type: "integrations:bigbluebutton",
      label: "BigBlueButton",
    },
  },
  dirName: "bigbluebuttonvideo",
  isOAuth: false,
} as AppMeta;

export default metadata;
