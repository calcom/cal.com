import { randomString } from "@calcom/lib/random";
import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Huddle01",
  description: _package.description,
  installed: true,
  type: "huddle01_video",
  imageSrc: "/apps/huddle.svg",
  variant: "conferencing",
  logo: "/apps/huddle.svg",
  publisher: "huddle01.com",
  url: "https://huddle01.com",
  verified: true,
  rating: 0, // TODO: placeholder for now, pull this from TrustPilot or G2
  reviews: 0, // TODO: placeholder for now, pull this from TrustPilot or G2
  category: "web3",
  label: "Huddle01 Video",
  slug: "huddle01_video",
  title: "Huddle01",
  trending: true,
  isGlobal: true,
  email: "support@huddle01.com",
  locationType: "integrations:huddle01",
  key: { apikey: randomString(12) },
} as App;

export * as lib from "./lib";
