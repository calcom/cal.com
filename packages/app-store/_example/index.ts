import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: _package.name,
  description: _package.description,
  installed: true,
  category: "video",
  imageSrc: "cal-com-icon.svg",
  label: "Example App",
  logo: "cal-com-icon.svg",
  publisher: "Cal.com",
  rating: 5,
  reviews: 69,
  slug: "example_video",
  title: "Example App",
  trending: true,
  type: "example_video",
  url: "https://cal.com/",
  variant: "conferencing",
  verified: true,
} as App;

export * as api from "./api";
export * as lib from "./lib";
