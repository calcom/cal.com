import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Apple Calendar",
  description: _package.description,
  installed: true,
  type: "apple_calendar",
  title: "Apple Calendar",
  imageSrc: "/api/app-store/applecalendar/icon.svg",
  variant: "calendar",
  category: "calendar",
  logo: "/api/app-store/applecalendar/icon.svg",
  publisher: "Cal.com",
  rating: 5,
  reviews: 69,
  slug: "apple-calendar",
  trending: false,
  url: "https://cal.com/",
  verified: true,
  email: "help@cal.com",
} as App;

export * as api from "./api";
export * as components from "./components";
export * as lib from "./lib";
