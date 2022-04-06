import type { App } from "@calcom/types/App";

import { LocationType } from "../locations";
import _package from "./package.json";

export const metadata = {
  name: "Zoom Video",
  description: _package.description,
  installed: !!(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET),
  type: "zoom_video",
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
  locationType: LocationType.Zoom,
  locationLabel: "Zoom Video",
} as App;

export * as api from "./api";
export * as lib from "./lib";
