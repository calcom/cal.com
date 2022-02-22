import type { App } from "@calcom/types/App";

import _metadata from "./package.json";

export const metadata = {
  ..._metadata,
  installed: !!(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET),
  type: "zoom_video",
  imageSrc: "apps/zoom.svg",
  variant: "conferencing",
  logo: "/apps/zoom.svg",
  publisher: "Cal.com",
  url: "https://zoom.us/",
  verified: true,
  rating: 4.3, // TODO: placeholder for now, pull this from TrustPilot or G2
  reviews: 69, // TODO: placeholder for now, pull this from TrustPilot or G2
} as Partial<App>;

export * as api from "./api";
export * as lib from "./lib";
