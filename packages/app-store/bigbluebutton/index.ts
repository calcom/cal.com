import type { App } from "@calcom/types/App";
import _package from "./package.json";

export const metadata = {
  name: "BigBlueButton",
  description: "Open source web conferencing system for online learning",
  type: "bigbluebutton_video",
  variant: "conferencing",
  logo: "icon.svg",
  categories: ["conferencing"],
  publisher: "Cal.com",
  slug: "bigbluebutton",
  title: "BigBlueButton",
  isGlobal: false,
  email: "help@cal.com",
  appData: {
    location: {
      linkType: "static",
      type: "integrations:bigbluebutton_video",
      label: "BigBlueButton",
    },
  },
  description:
    "BigBlueButton is an open source web conferencing system for online learning. It provides real-time sharing of audio, video, slides, chat, and screen.",
  isTemplate: false,
  __createdUsingCli: false,
  dependencies: [],
  concurrentMeetings: false,
} as App;

export default metadata;
