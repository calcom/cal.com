import fs from "fs";
import path from "path";

import type { App } from "@calcom/types/App";

import config from "./config.json";
import _package from "./package.json";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
export const metadata = {
  name: "CLI_BASE__APP_NAME",
  description: _package.description,
  category: "other",
  imageSrc: "/api/app-store/CLI_BASE__APP_NAME/icon.svg",
  logo: "/api/app-store/CLI_BASE__APP_NAME/icon.svg",
  publisher: "CLI_BASE__PUBLISHER_NAME",
  rating: 0,
  reviews: 0,
  slug: "CLI_BASE__APP_NAME",
  title: "CLI_BASE__APP_TITLE",
  trending: true,
  type: "CLI_BASE__APP_NAME_CLI_BASE__APP_TYPE",
  url: "https://cal.com/apps/CLI_BASE__APP_NAME",
  variant: "CLI_BASE__APP_TYPE",
  verified: true,
  email: "CLI_BASE__PUBLISHER_EMAIL",
  ...config,
} as App;

export default metadata;
