import { randomString } from "@calcom/lib/random";
import type { App } from "@calcom/types/App";

import { LocationType } from "../locations";
import _package from "./package.json";

export const metadata = {
  name: "Huddle01",
  description: _package.description,
  installed: true,
  type: "huddle01_video",
  imageSrc: "/api/app-store/huddle01video/icon.svg",
  variant: "conferencing",
  logo: "/api/app-store/huddle01video/icon.svg",
  publisher: "huddle01.com",
  url: "https://huddle01.com",
  verified: true,
  rating: 0, // TODO: placeholder for now, pull this from TrustPilot or G2
  reviews: 0, // TODO: placeholder for now, pull this from TrustPilot or G2
  category: "web3",
  slug: "huddle01_video",
  title: "Huddle01",
  trending: true,
  isGlobal: true,
  email: "support@huddle01.com",
  locationType: LocationType.Huddle01,
  locationLabel: "Huddle01 Video",
  key: { apikey: randomString(12) },
} as App;

export * as lib from "./lib";
