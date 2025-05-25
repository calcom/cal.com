import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Google Sheets",
  description: _package.description,
  installed: true,
  type: "googlesheets_other",
  title: "Google Sheets",
  variant: "other",
  slug: "googlesheets",
  category: "other",
  categories: ["other"],
  logo: "icon.svg",
  publisher: "Cal.com",
  email: "help@cal.com",
  dirName: "googlesheets",
  url: "https://sheets.google.com/",
} as AppMeta;
