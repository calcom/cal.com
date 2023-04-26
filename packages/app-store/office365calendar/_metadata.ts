import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Outlook Calendar",
  description: _package.description,
  type: "office365_calendar",
  title: "Outlook Calendar",
  imageSrc: "/api/app-store/office365calendar/icon.svg",
  variant: "calendar",
  category: "calendar",
  categories: ["calendar"],
  logo: "/api/app-store/office365calendar/icon.svg",
  publisher: "Cal.com",
  slug: "office365-calendar",
  url: "https://cal.com/",
  email: "help@cal.com",
} as AppMeta;

export default metadata;
