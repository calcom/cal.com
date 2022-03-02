import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: _package.name,
  description: _package.description,
  installed: !!(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET),
  category: "video",
  imageSrc: "apps/slack.svg",
  label: "Slack App",
  logo: "/apps/slack.svg",
  publisher: "Cal.com",
  rating: 5,
  reviews: 69,
  slug: "slack_app",
  title: "Slack App",
  trending: true,
  type: "slack_app",
  url: "https://slack.com/",
  variant: "conferencing",
  verified: true,
} as App;

export * as api from "./api";
