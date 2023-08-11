import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Slack",
  description: _package.description,
  slug: "slack",
  category: "messaging",
  categories: ["messaging"],
  logo: "icon.svg",
  publisher: "Cal.com",
  title: "Slack",
  type: "slack_messaging",
  url: "https://cal.com/",
  docsUrl: "https://stripe.com/docs",
  variant: "automation",
  extendsFeature: "EventType",
  email: "help@cal.com",
  dirName: "slack",
} as AppMeta;

export default metadata;
