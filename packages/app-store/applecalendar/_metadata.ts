import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Apple Calendar",
  description: _package.description,
  installed: true,
  type: "apple_calendar",
  title: "Apple Calendar",
  imageSrc: "/api/app-store/applecalendar/icon.svg",
  variant: "calendar",
  categories: ["calendar"],
  category: "calendar",
  logo: "/api/app-store/applecalendar/icon.svg",
  publisher: "Cal.com",
  slug: "apple-calendar",
  url: "https://cal.com/",
  email: "help@cal.com",
  dirName: "applecalendar",
} as AppMeta;

export default metadata;
