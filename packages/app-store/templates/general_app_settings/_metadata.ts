import type { AppMeta } from "@calcom/types/App";

import config from "./config.json";

export const metadata = {
  category: "other",
  dirName: "general_app_settings",
  ...config,
} as AppMeta;

export default metadata;
