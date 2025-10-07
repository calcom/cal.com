import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Cal Video",
  description: _package.description,
  installed: !!process.env.DAILY_API_KEY,
  type: "daily_video",
  variant: "conferencing",
  url: "https://daily.co",
  categories: ["conferencing"],
  logo: "icon.svg",
  publisher: "Cal ID",
  category: "conferencing",
  slug: "daily-video",
  title: "Cal Video",
  isGlobal: false,
  email: "support@cal.id",
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:daily",
      label: "Cal Video",
    },
  },
  key: { apikey: process.env.DAILY_API_KEY },
  dirName: "dailyvideo",
  isOAuth: false,
} as AppMeta;

export default metadata;
