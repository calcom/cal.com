import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "CalDav Server",
  description: _package.description,
  installed: true,
  type: "caldav_calendar",
  title: "CalDav Server",
  imageSrc: "/api/app-store/caldavcalendar/icon.svg",
  variant: "calendar",
  category: "calendar",
  logo: "/api/app-store/caldavcalendar/icon.svg",
  publisher: "Cal.com",
  rating: 5,
  reviews: 69,
  slug: "caldav-calendar",
  trending: false,
  url: "https://cal.com/",
  verified: true,
  email: "help@cal.com",
} as AppMeta;

export default metadata;
