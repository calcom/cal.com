import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Jitsi Video",
  description:
    "Jitsi is a free open-source video conferencing software for web and mobile. Make a call, launch on your own servers, integrate into your app, and more.",
  installed: true,
  type: "jitsi_video",
  variant: "conferencing",
  categories: ["conferencing"],
  logo: "icon.svg",
  publisher: "Cal.com",
  url: "https://jitsi.org/",
  slug: "jitsi",
  title: "Jitsi Meet",
  isGlobal: false,
  email: "help@cal.com",
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:jitsi",
      label: "Jitsi Video",
    },
  },
  dirName: "jitsivideo",
  concurrentMeetings: true,
  isOAuth: false,
} as AppMeta;

export default metadata;
