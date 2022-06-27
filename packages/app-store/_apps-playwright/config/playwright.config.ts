import { PlaywrightTestConfig, devices } from "@playwright/test";
import { config as dotEnvConfig } from "dotenv";
import * as path from "path";

// TODO: May be derive it automatically, so that moving the file to another location doesn't require changing the code
dotEnvConfig({ path: "../../../../../.env" });
const DEFAULT_NAVIGATION_TIMEOUT = 15000;

// Paths are relative to main playwright config.
const outputDir = path.join("../results");
const testDir = path.join("../tests");

// Quick Mode has no retries to fail fast and quickly re-iterate
// Also, it runs the tests only one browser for the same reason
const quickMode = process.env.QUICK === "true";
const CI = process.env.CI;
export const config: PlaywrightTestConfig = {
  forbidOnly: !!CI,
  retries: quickMode && !CI ? 0 : 1,
  workers: 1,
  timeout: 60_000,
  reporter: [
    [CI ? "github" : "list"],
    [
      "html",
      {
        outputFolder: path.join(process.cwd(), "playwright", "reports", "playwright-html-report"),
        open: "never",
      },
    ],
    ["junit", { outputFile: path.join(process.cwd(), "playwright", "reports", "results.xml") }],
  ],
  outputDir,
  webServer: {
    command: "NEXT_PUBLIC_IS_E2E=1 yarn workspace @calcom/web start -p 3000",
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
      testDir,
      use: {
        ...devices["Desktop Chrome"],
        /** If navigation takes more than this, then something's wrong, let's fail fast. */
        navigationTimeout: DEFAULT_NAVIGATION_TIMEOUT,
      },
    },
  ],
};
