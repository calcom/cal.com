import type { AppMeta } from "@calcom/types/App";

import config from "./config.json";

export const metadata = {
  category: "other",
  dirName: "sirius_video",
  ...config,
} as AppMeta;

export default metadata;
