import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "CalDav (Beta)",
  description: _package.description,
  installed: true,
  type: "caldav_calendar",
  title: "CalDav (Beta)",
  variant: "calendar",
  category: "calendar",
  categories: ["calendar"],
  logo: "icon.svg",
  publisher: "Cal.com",
  slug: "caldav-calendar",
  url: "https://cal.com/",
  email: "help@cal.com",
  dirName: "caldavcalendar",
} as App;

export * as api from "./api";
export * as lib from "./lib";
