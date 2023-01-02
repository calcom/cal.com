import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  linkType: "dynamic",
  name: "Zoom Video",
  description: _package.description,
  type: "zoom_video",
  categories: ["video"],
  imageSrc: "/api/app-store/zoomvideo/icon.svg",
  variant: "conferencing",
  logo: "/api/app-store/zoomvideo/icon.svg",
  publisher: "Cal.com",
  url: "https://zoom.us/",
  verified: true,
  rating: 4.3, // TODO: placeholder for now, pull this from TrustPilot or G2
  reviews: 69, // TODO: placeholder for now, pull this from TrustPilot or G2
  category: "video",
  slug: "zoom",
  title: "Zoom Video",
  trending: true,
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
