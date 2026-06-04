import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "BigBlueButton Video",
  description:
    "BigBlueButton is an open-source web conferencing system designed for online learning. It supports real-time sharing of audio, video, slides, and screen.",
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
} as AppMeta;
