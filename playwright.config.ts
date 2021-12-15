import { PlaywrightTestConfig, devices } from "@playwright/test";

const config: PlaywrightTestConfig = {
  forbidOnly: !!process.env.CI,
  testDir: "playwright",
  timeout: 60_000,
  retries: process.env.CI ? 3 : 0,
  globalSetup: require.resolve("./playwright/lib/globalSetup"),
  use: {
    baseURL: "http://localhost:3000",
    locale: "en-US",
    trace: "on-first-retry",
    headless: !!process.env.CI || !!process.env.PLAYWRIGHT_HEADLESS,
    contextOptions: {
      recordVideo: {
        dir: "playwright/videos",
      },
    },
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
