import type { App } from "@calcom/types/App";
import _package from "./package.json";

export const metadata = {
  name: "Sendly SMS",
  description: _package.description,
  installed: true,
  type: "sendly-sms_messaging",
  variant: "other",
  logo: "icon.svg",
  publisher: "Sendly",
  url: "https://sendly.live",
  categories: ["messaging", "automation"],
  slug: "sendly-sms",
  title: "Sendly SMS",
  email: "support@sendly.live",
  dirName: "sendly-sms",
} as App;

export * as api from "./api";
export * as components from "./components";
