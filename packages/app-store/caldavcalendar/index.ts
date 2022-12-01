import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { AppMeta } from "@calcom/types/App";

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
  logo: "/api/app-store/caldavcalendar/icon.svg",
  publisher: APP_NAME,
  rating: 5,
  reviews: 69,
  slug: "caldav-calendar",
  trending: false,
  url: "https://cal.com/",
  verified: true,
  email: SUPPORT_MAIL_ADDRESS,
} as AppMeta;

export * as api from "./api";
export * as lib from "./lib";
