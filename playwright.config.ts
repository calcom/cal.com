import { devices, PlaywrightTestConfig } from "@playwright/test";
import dotEnv from "dotenv";
import * as os from "os";
import * as path from "path";

dotEnv.config({ path: ".env" });

const outputDir = path.join(__dirname, "test-results");
const testDir = path.join(__dirname, "apps/web/playwright");

const DEFAULT_NAVIGATION_TIMEOUT = 15000;

const headless = !!process.env.CI || !!process.env.PLAYWRIGHT_HEADLESS;

const config: PlaywrightTestConfig = {
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: os.cpus().length,
  timeout: 60_000,
  maxFailures: headless ? 10 : undefined,
  reporter: [
    [process.env.CI ? "github" : "list"],
    ["html", { outputFolder: "./test-results/reports/playwright-html-report", open: "never" }],
    ["junit", { outputFile: "./test-results/reports/results.xml" }],
  ],
  globalSetup: require.resolve("./tests/config/globalSetup"),
  outputDir: path.join(outputDir, "results"),
  webServer: {
    command: "NEXT_PUBLIC_IS_E2E=1 yarn workspace @calcom/web start -p 3000",
    port: 3000,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:3000/",
    locale: "en-US",
    trace: "retain-on-failure",
    headless,
  },
  projects: [
    {
      name: "@calcom/web",
      testDir: "./apps/web/playwright",
      use: {
        ...devices["Desktop Chrome"],
        /** If navigation takes more than this, then something's wrong, let's fail fast. */
        navigationTimeout: DEFAULT_NAVIGATION_TIMEOUT,
      },
    },
    {
      name: "@calcom/app-store",
      testDir: "./packages/app-store/",
      testMatch: /\/packages\/app-store.*\.e2e\.tsx?/,
      use: {
        ...devices["Desktop Chrome"],
        /** If navigation takes more than this, then something's wrong, let's fail fast. */
        navigationTimeout: DEFAULT_NAVIGATION_TIMEOUT,
      },
    },
  ],
};

export default config;
