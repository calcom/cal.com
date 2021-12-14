import { PlaywrightTestConfig, devices } from "@playwright/test";

const opts = {
  // launch headless on CI, in browser locally
  headless: !!process.env.CI || !!process.env.PLAYWRIGHT_HEADLESS,
  collectCoverage: false, // not possible in Next.js 12
  executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH,
};

console.log("⚙️ Playwright options:", JSON.stringify(opts, null, 4));

const config: PlaywrightTestConfig = {
  forbidOnly: !!process.env.CI,
  timeout: 60e3,
  retries: process.env.CI ? 3 : 0,
  globalSetup: require.resolve("./playwright/lib/globalSetup"),
  use: {
    baseURL: "http://localhost:3000",
    locale: "en-US",
    trace: "on-first-retry",
    headless: opts.headless,
    contextOptions: {
      recordVideo: {
        dir: "playwright/videos",
      },
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], launchOptions: { executablePath: opts.executablePath } },
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
