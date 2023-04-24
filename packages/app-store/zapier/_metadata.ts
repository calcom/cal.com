import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Zapier",
  description: _package.description,
  installed: true,
  category: "automation",
  categories: ["automation"],
  logo: "icon.svg",
  publisher: "Cal.com",
  rating: 0,
  reviews: 0,
  slug: "zapier",
  title: "Zapier",
  trending: true,
  type: "zapier_automation",
  url: "https://cal.com/apps/zapier",
  variant: "automation",
  verified: true,
  email: "help@cal.com",
  dirName: "zapier",
} as AppMeta;

export default metadata;
