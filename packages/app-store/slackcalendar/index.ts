import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: _package.name,
  description: _package.description,
  installed: true,
  category: "video",
  imageSrc: "cal-com-icon.svg",
  label: "Slack App",
  logo: "cal-com-icon.svg",
  publisher: "Cal.com",
  rating: 5,
  reviews: 69,
  slug: "slack_calendar",
  title: "Slack App",
  trending: true,
  type: "slack_calendar",
  url: "https://cal.com/",
  variant: "conferencing",
  verified: true,
} as App;

export * as api from "./api";
