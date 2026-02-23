import path from "node:path";

import i18nConfig from "@calcom/config/next-i18next.config";

import type { UserConfig } from "next-i18next";

const config: UserConfig = {
  ...i18nConfig,
  localePath: path.resolve("./public/static/locales"),
};

export default config;
