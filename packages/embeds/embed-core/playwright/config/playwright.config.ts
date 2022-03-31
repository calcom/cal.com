import { PlaywrightTestConfig, Frame, devices, expect } from "@playwright/test";
import * as path from "path";

const outputDir = path.join("../results");
const testDir = path.join("../tests");

const config: PlaywrightTestConfig = {
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  timeout: 60_000,
  reporter: [
    [process.env.CI ? "github" : "list"],
    [
      "html",
      { outputFolder: path.join(__dirname, "..", "reports", "playwright-html-report"), open: "never" },
    ],
    ["junit", { outputFile: path.join(__dirname, "..", "reports", "results.xml") }],
  ],
  globalSetup: require.resolve("./globalSetup"),
  outputDir,
  webServer: {
    // Start App Server manually - Can't be handled here. See https://github.com/microsoft/playwright/issues/8206
    command: "yarn workspace @calcom/embed-core dev",
    port: 3002,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:3002",
    locale: "en-US",
    trace: "retain-on-failure",
    headless: !!process.env.CI || !!process.env.PLAYWRIGHT_HEADLESS,
  },
  projects: [
    {
      name: "chromium",
      testDir,
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
export type ExpectedUrlDetails = {
  searchParams?: Record<string, string | string[]>;
  pathname?: string;
  origin?: string;
};

declare global {
  namespace PlaywrightTest {
    //FIXME: how to restrict it to Frame only
    interface Matchers<R> {
      toBeEmbedCalLink(expectedUrlDetails?: ExpectedUrlDetails): R;
    }
  }
}

expect.extend({
  async toBeEmbedCalLink(iframe: Frame, expectedUrlDetails: ExpectedUrlDetails = {}) {
    if (!iframe || !iframe.url) {
      return {
        pass: false,
        message: () => `Expected to provide an iframe, got ${iframe}`,
      };
    }

    const u = new URL(iframe.url());
    const frameElement = await iframe.frameElement();

    if (!(await frameElement.isVisible())) {
      return {
        pass: false,
        message: () => `Expected iframe to be visible`,
      };
    }
    const pathname = u.pathname;
    const expectedPathname = expectedUrlDetails.pathname;
    if (expectedPathname && expectedPathname !== pathname) {
      return {
        pass: false,
        message: () => `Expected pathname to be ${expectedPathname} but got ${pathname}`,
      };
    }

    const origin = u.origin;
    const expectedOrigin = expectedUrlDetails.origin;
    if (expectedOrigin && expectedOrigin !== origin) {
      return {
        pass: false,
        message: () => `Expected origin to be ${expectedOrigin} but got ${origin}`,
      };
    }

    const searchParams = u.searchParams;
    const expectedSearchParams = expectedUrlDetails.searchParams || {};
    for (let [expectedKey, expectedValue] of Object.entries(expectedSearchParams)) {
      const value = searchParams.get(expectedKey);
      if (value !== expectedValue) {
        return {
          message: () => `${expectedKey} should have value ${expectedValue} but got value ${value}`,
          pass: false,
        };
      }
    }
    return {
      pass: true,
      message: () => `passed`,
    };
  },
});
export default config;
