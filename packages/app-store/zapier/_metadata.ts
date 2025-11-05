import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Zapier",
  description: _package.description,
  installed: true,
  category: "automation",
  categories: ["automation"],
  logo: "icon.svg",
  publisher: "Cal ID",
  slug: "zapier",
  title: "Zapier",
  type: "zapier_automation",
  url: "https://cal.id/apps/zapier",
  variant: "automation",
  email: "support@cal.id",
  dirName: "zapier",
  isOAuth: false,
} as AppMeta;

export default metadata;
