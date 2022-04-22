import { PlaywrightTestConfig, devices } from "@playwright/test";
import path from "path";

//TODO: Move the common config to embed-playwright-config and let core and react use the base. Along with config there would be base fixtures and expect custom matchers as well.
import baseConfig from "@calcom/embed-core/playwright/config/playwright.config";

const testDir = path.join("../tests");

const projects = baseConfig.projects?.map((project) => {
  if (!project.name) {
    return {};
  }
  return {
    ...project,
    testDir,
  };
});

const config: PlaywrightTestConfig = {
  ...baseConfig,
  webServer: {
    // Start App Server manually - Can't be handled here. See https://github.com/microsoft/playwright/issues/8206
    command: "yarn workspace @calcom/embed-react dev",
    port: 3101,
    timeout: 60_000,
    reuseExistingServer: true,
  },
  use: {
    ...baseConfig.use,
    baseURL: "http://localhost:3101",
  },
  projects,
};
export default config;
