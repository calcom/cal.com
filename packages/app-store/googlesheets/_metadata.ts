import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Google Sheets",
  description: _package.description,
  installed: !!(process.env.GOOGLE_SHEETS_CLIENT_ID && process.env.GOOGLE_SHEETS_CLIENT_SECRET),
  type: "googlesheets_other",
  title: "Google Sheets",
  variant: "other",
  category: "automation",
  categories: ["automation"],
  logo: "icon.svg",
  publisher: "Cal.com",
  slug: "googlesheets",
  url: "https://sheets.google.com",
  email: "help@cal.com",
  dirName: "googlesheets",
  isOAuth: true,
} as AppMeta;

export default metadata;
