import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Zoho Calendar",
  description: _package.description,
  installed: true,
  type: "zoho_calendar",
  title: "Zoho Calendar",
  variant: "calendar",
  category: "calendar",
  categories: ["calendar"],
  logo: "icon.svg",
  publisher: "Cal.com",
  slug: "zoho-calendar",
  url: "https://cal.com/",
  email: "help@cal.com",
} as AppMeta;

export default metadata;
