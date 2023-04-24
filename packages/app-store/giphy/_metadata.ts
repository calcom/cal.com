import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Giphy",
  description: _package.description,
  installed: true,
  categories: ["other"],
  logo: "icon.svg",
  publisher: "Cal.com",
  rating: 0,
  reviews: 0,
  slug: "giphy",
  title: "Giphy",
  trending: true,
  type: "giphy_other",
  url: "https://cal.com/apps/giphy",
  variant: "other",
  verified: true,
  extendsFeature: "EventType",
  email: "help@cal.com",
  dirName: "giphy",
} as AppMeta;

export default metadata;
