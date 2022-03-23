import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Microsoft Exchange Calendar",
  description: _package.description,
  installed: true,
  type: "exchange_calendar",
  title: "Microsoft Exchange Calendar",
  // Add exchange icon to calendar
  imageSrc: "apps/caldav.svg",
  variant: "calendar",
  category: "calendar",
  label: "Exchange Calendar",
  logo: "/apps/caldav.svg",
  publisher: "Cal.com",
  rating: 5,
  reviews: 69,
  slug: "exchange-calendar",
  trending: false,
  url: "https://cal.com/",
  verified: true,
  email: "help@cal.com",
} as App;

export * as components from "./components";
export * as lib from "./lib";
