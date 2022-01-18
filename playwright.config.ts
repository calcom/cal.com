import { PlaywrightTestConfig, devices } from "@playwright/test";

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
