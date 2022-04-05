import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Slack App",
  description: _package.description,
  installed: !!(
    process.env.SLACK_CLIENT_ID &&
    process.env.SLACK_CLIENT_SECRET &&
    process.env.SLACK_SIGNING_SECRET
  ),
  category: "messaging",
  imageSrc: "/apps/slack.svg",
  logo: "/apps/slack.svg",
  publisher: "Cal.com",
  rating: 5,
  reviews: 69,
  slug: "slack",
  title: "Slack App",
  trending: true,
  type: "slack_messaging",
  url: "https://slack.com/",
  variant: "conferencing",
  verified: true,
  email: "help@cal.com",
} as App;

export * as api from "./api";
