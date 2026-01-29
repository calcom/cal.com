import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Lever ATS",
  description: "Lever ATS integration via Merge.dev for candidate management and activity logging",
  installed: true,
  type: "lever_other",
  title: "Lever ATS",
  variant: "other",
  category: "crm",
  categories: ["crm"],
  logo: "icon.svg",
  publisher: "Cal.com",
  slug: "lever",
  url: "https://www.lever.co/",
  email: "help@cal.com",
  dirName: "lever",
  isOAuth: true,
} as AppMeta;

export default metadata;