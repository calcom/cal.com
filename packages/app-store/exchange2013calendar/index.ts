import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Microsoft Exchange 2013 Calendar",
  description: _package.description,
  installed: true,
  type: "exchange_calendar",
  title: "Microsoft Exchange 2013 Calendar",
  // Add exchange icon to calendar
  imageSrc: "apps/microsoft-exchange.svg",
  variant: "calendar",
  category: "calendar",
  label: "Exchange Calendar",
  logo: "/apps/microsoft-exchange.svg",
  publisher: "Cal.com",
  rating: 5,
  reviews: 69,
  slug: "exchange2013-calendar",
  trending: false,
  url: "https://cal.com/",
  verified: true,
  email: "help@cal.com",
} as App;

export * as components from "./components";
export * as lib from "./lib";
export * as api from "./api";
