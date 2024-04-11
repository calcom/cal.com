import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  linkType: "dynamic",
  name: "Zoom Video",
  description: _package.description,
  type: "zoom_video",
  categories: ["conferencing"],
  variant: "conferencing",
  logo: "icon.svg",
  publisher: "Cal.com",
  url: "https://zoom.us/",
  category: "conferencing",
  slug: "zoom",
  title: "Zoom Video",
  email: "help@cal.com",
  appData: {
    location: {
      default: false,
      linkType: "dynamic",
      type: "integrations:zoom",
      label: "Zoom Video",
    },
  },
  dirName: "zoomvideo",
} as AppMeta;

export default metadata;
