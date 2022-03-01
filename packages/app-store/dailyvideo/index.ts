import type { App } from "@calcom/types/App";

import _metadata from "./package.json";

export const metadata = {
  ..._metadata,
  installed: !!process.env.DAILY_API_KEY,
  type: "daily_video",
  imageSrc: "apps/daily.svg",
  variant: "conferencing",
  url: "https://daily.co/",
  trending: true,
} as Partial<App>;

export * as lib from "./lib";
