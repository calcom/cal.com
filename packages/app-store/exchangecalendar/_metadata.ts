import type { App } from "@calcom/types/App";

import config from "./config.json";

export const metadata = {
  category: "calendar",
  installed: true,
  rating: 0,
  reviews: 0,
  trending: true,
  verified: true,
  dirName: "exchangecalendar",
  ...config,
} as App;

export default metadata;
