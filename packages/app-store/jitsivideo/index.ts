import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Jitsi Video",
  description: _package.description,
  installed: true,
  type: "jitsi_video",
  imageSrc: "/apps/jitsi.svg",
  variant: "conferencing",
  logo: "/apps/jitsi.svg",
  locationType: "integrations:jitsi",
  publisher: "Cal.com",
  url: "https://jitsi.org/",
  verified: true,
  rating: 0, // TODO: placeholder for now, pull this from TrustPilot or G2
  reviews: 0, // TODO: placeholder for now, pull this from TrustPilot or G2
  category: "video",
  label: "Jitsi Video",
  slug: "jitsi_video",
  title: "Jitsi Meet",
  trending: true,
  isGlobal: true,
  email: "help@cal.com",
} as App;

export * as lib from "./lib";
