import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Slack",
  description:
    "Get real-time booking notifications in your Slack channels. Subscribe to specific Cal.com events and keep your team informed.",
  installed: true,
  category: "automation",
  categories: ["automation", "messaging"],
  logo: "icon.svg",
  publisher: "Cal.com",
  slug: "slack",
  title: "Slack",
  type: "slack_messaging",
  url: "https://slack.com",
  variant: "automation",
  email: "help@cal.com",
  dirName: "slack",
  isOAuth: true,
} as AppMeta;

export default metadata;
