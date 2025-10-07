import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Apple Calendar",
  description: _package.description,
  installed: true,
  type: "apple_calendar",
  title: "Apple Calendar",
  variant: "calendar",
  categories: ["calendar"],
  category: "calendar",
  logo: "icon.svg",
  publisher: "Cal ID",
  slug: "apple-calendar",
  url: "https://cal.id/",
  email: "support@cal.id",
  dirName: "applecalendar",
  isOAuth: false,
} as AppMeta;

export default metadata;
