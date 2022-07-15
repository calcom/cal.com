import { expect, Config } from "@playwright/test";

import { config as baseConfig } from "@calcom/app-store/_apps-playwright/config/playwright.config";

const config: Config = {
  ...baseConfig,
  globalSetup: require.resolve("./globalSetup"),
  globalTeardown: require.resolve("./globalTeardown"),
};

expect.extend({});
export default config;
