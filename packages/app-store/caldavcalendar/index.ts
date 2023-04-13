import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "CalDav (Beta)",
  description: _package.description,
  installed: true,
  type: "caldav_calendar",
  title: "CalDav (Beta)",
  imageSrc: "/api/app-store/caldavcalendar/icon.svg",
  variant: "calendar",
  category: "calendar",
  categories: ["calendar"],
  logo: "/api/app-store/caldavcalendar/icon.svg",
  publisher: "Cal.com",
  rating: 5,
  reviews: 69,
  slug: "caldav-calendar",
  trending: false,
  url: "https://cal.com/",
  verified: true,
  email: "help@cal.com",
  dirName: "caldavcalendar",
} as App;

export * as api from "./api";
export * as lib from "./lib";
