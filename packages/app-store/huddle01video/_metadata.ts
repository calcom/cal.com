import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Huddle01",
  description: _package.description,
  installed: true,
  type: "huddle01_video",
  variant: "conferencing",
  categories: ["video", "conferencing"],
  logo: "icon.svg",
  publisher: "huddle01.com",
  url: "https://huddle01.com",
  category: "conferencing",
  slug: "huddle01",
  title: "Huddle01",
  isGlobal: false,
  email: "support@huddle01.com",
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:huddle01_video",
      label: "Huddle01 Video",
    },
  },
  dirName: "huddle01video",
  concurrentMeetings: true,
  isOAuth: false,
} as AppMeta;

export default metadata;
