import type { AppMeta } from "@calcom/types/App";
import config from "./config.json";

export const metadata = {
  ...config,
  dirName: "lyra",
} as AppMeta;

export default metadata;
