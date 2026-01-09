import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Lever",
  installed: true,
  description: _package.description,
  type: "lever_crm",
  variant: "crm",
  logo: "icon.svg",
  publisher: "Cal.com",
  url: "https://www.lever.co/",
  categories: ["crm"],
  label: "Lever ATS",
  slug: "lever",
  extendsFeature: "EventType",
  title: "Lever",
  email: "help@cal.com",
  dirName: "lever",
  isOAuth: true,
} as AppMeta;

export default metadata;
