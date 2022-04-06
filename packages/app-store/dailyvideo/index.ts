import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Cal Video",
  description: _package.description,
  installed: !!process.env.DAILY_API_KEY,
  type: "daily_video",
  imageSrc: "/apps/daily.svg",
  variant: "conferencing",
  url: "https://daily.co/",
  trending: true,
  logo: "/apps/daily.svg",
  publisher: "Cal.com",
  verified: true,
  rating: 4.3, // TODO: placeholder for now, pull this from TrustPilot or G2
  reviews: 69, // TODO: placeholder for now, pull this from TrustPilot or G2
  category: "video",
  label: "Daily.co Video",
  slug: "dailyvideo",
  title: "Daily.co Video",
  isGlobal: true,
  email: "help@cal.com",
  locationType: "integrations:daily",
  key: { apikey: process.env.DAILY_API_KEY },
} as App;

export * as lib from "./lib";
