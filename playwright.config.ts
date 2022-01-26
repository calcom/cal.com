import { PlaywrightTestConfig, devices } from "@playwright/test";
import { addAliases } from "module-alias";

// Add aliases for the paths specified in the tsconfig.json file.
// This is needed because playwright does not consider tsconfig.json
// For more info, see:
// https://stackoverflow.com/questions/69023682/typescript-playwright-error-cannot-find-module
// https://github.com/microsoft/playwright/issues/7066#issuecomment-983984496
addAliases({
  "@components": __dirname + "/components",
  "@lib": __dirname + "/lib",
  "@server": __dirname + "/server",
  "@ee": __dirname + "/ee",
});

const config: PlaywrightTestConfig = {
  forbidOnly: !!process.env.CI,
  testDir: "playwright",
  timeout: 60_000,
  reporter: "list",
  globalSetup: require.resolve("./playwright/lib/globalSetup"),
  outputDir: "playwright/results",
  webServer: {
    command: "yarn start",
    port: 3000,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:3000",
    locale: "en-US",
    trace: "retain-on-failure",
    headless: !!process.env.CI || !!process.env.PLAYWRIGHT_HEADLESS,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    /*  {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    }, */
  ],
};

export default config;
