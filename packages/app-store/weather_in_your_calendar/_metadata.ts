import type { AppMeta } from "@calcom/types/App";

import config from "./config.json";

export const metadata = {
  category: "other",
  dirName: "weather_in_your_calendar",
  ...config,
} as AppMeta;

export default metadata;
