import type { App } from "@calcom/types/App";

import { LocationType } from "../locations";
import _package from "./package.json";

export const metadata = {
  name: "Jitsi Video",
  description: _package.description,
  installed: true,
  type: "jitsi_video",
  imageSrc: "/api/app-store/jitsivideo/icon.svg",
  variant: "conferencing",
  logo: "/api/app-store/jitsivideo/icon.svg",
  publisher: "Cal.com",
  url: "https://jitsi.org/",
  verified: true,
  rating: 0, // TODO: placeholder for now, pull this from TrustPilot or G2
  reviews: 0, // TODO: placeholder for now, pull this from TrustPilot or G2
  category: "video",
  slug: "jitsi_video",
  title: "Jitsi Meet",
  trending: true,
  isGlobal: true,
  email: "help@cal.com",
  locationType: LocationType.Jitsi,
  locationLabel: "Jitsi Video",
} as App;

export * as lib from "./lib";
