import type { App } from "@calcom/types/App";

import config from "./config.json";
import _package from "./package.json";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
export const metadata = {
  description: _package.description,
  category: "other",
  rating: 0,
  reviews: 0,
  trending: true,
  verified: true,
  email: "CLI_BASE__PUBLISHER_EMAIL",
  ...config,
} as App;

export default metadata;
