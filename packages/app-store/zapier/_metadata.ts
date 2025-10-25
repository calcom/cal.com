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
  slug: "zapier",
  title: "Zapier",
  type: "zapier_automation",
  url: "https://zapier.com/apps/calcom/integrations",
  variant: "automation",
  email: "help@cal.com",
  dirName: "zapier",
  isOAuth: false,
} as AppMeta;

export default metadata;
