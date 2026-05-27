import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "BigBlueButton",
  description:
    "BigBlueButton is an open-source virtual classroom and web conferencing platform with audio, video, slides, screen sharing, chat, and breakout rooms.",
  installed: true,
  type: "bigbluebutton_video",
  variant: "conferencing",
  categories: ["conferencing"],
  logo: "icon.svg",
  publisher: "BigBlueButton",
  url: "https://bigbluebutton.org/",
  slug: "bigbluebutton",
  title: "BigBlueButton",
  isGlobal: false,
  email: "support@bigbluebutton.org",
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:bigbluebutton",
      label: "BigBlueButton",
    },
  },
  dirName: "bigbluebutton",
  concurrentMeetings: true,
  isOAuth: false,
} as AppMeta;

export default metadata;
