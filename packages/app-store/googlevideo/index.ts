import { validJson } from "@calcom/lib/jsonUtils";
import type { App } from "@calcom/types/App";

import { LocationType } from "../locations";
import _package from "./package.json";

export const metadata = {
  name: "Google Meet",
  description: _package.description,
  installed: !!(process.env.GOOGLE_API_CREDENTIALS && validJson(process.env.GOOGLE_API_CREDENTIALS)),
  slug: "google-meet",
  category: "video",
  type: "google_video",
  title: "Google Meet",
  imageSrc: "https://cdn.iconscout.com/icon/free/png-256/google-meet-2923654-2416657.png",
  variant: "conferencing",
  logo: "https://cdn.iconscout.com/icon/free/png-256/google-meet-2923654-2416657.png",
  publisher: "Cal.com",
  rating: 5,
  reviews: 69,
  trending: false,
  url: "https://cal.com/",
  verified: true,
  email: "help@cal.com",
  locationType: LocationType.GoogleMeet,
  locationLabel: "Google Meet",
} as App;

// export * as api from "./api";
// export * as lib from "./lib";
