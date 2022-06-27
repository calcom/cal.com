import { expect, Config } from "@playwright/test";

import { config as baseConfig } from "../../../_apps-playwright/config/playwright.config";

declare global {
  namespace PlaywrightTest {}
}

const config: Config = {
  ...baseConfig,
  globalSetup: require.resolve("./globalSetup"),
  globalTeardown: require.resolve("./globalTeardown"),
};

expect.extend({});
export default config;
