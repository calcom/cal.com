import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Giphy",
  description: _package.description,
  installed: true,
  categories: ["other"],
  logo: "icon.svg",
  publisher: "Cal.com",
  slug: "giphy",
  title: "Giphy",
  type: "giphy_other",
  url: "https://cal.com/apps/giphy",
  variant: "other",
  extendsFeature: "EventType",
  email: "help@cal.com",
  dirName: "giphy",
  isOAuth: false,
} as AppMeta;

export default metadata;
