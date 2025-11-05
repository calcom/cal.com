import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Giphy",
  description: _package.description,
  installed: true,
  categories: ["other"],
  logo: "icon.svg",
  publisher: "Cal ID",
  slug: "giphy",
  title: "Giphy",
  type: "giphy_other",
  url: "https://cal.id/apps/giphy",
  variant: "other",
  extendsFeature: "EventType",
  email: "support@cal.id",
  dirName: "giphy",
  isOAuth: false,
} as AppMeta;

export default metadata;
