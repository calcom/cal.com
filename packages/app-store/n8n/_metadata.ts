import type { AppMeta } from "@calcom/types/App";

import config from "./config.json";

export const metadata = {
  category: "automation",
  dirName: "n8n",
  ...config,
} as AppMeta;

export default metadata;
