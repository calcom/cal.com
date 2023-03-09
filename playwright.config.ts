import type { PlaywrightTestConfig } from "@playwright/test";
import { devices } from "@playwright/test";
import dotEnv from "dotenv";
import * as os from "os";
import * as path from "path";

dotEnv.config({ path: ".env" });

const outputDir = path.join(__dirname, "test-results");

// Dev Server on local can be slow to start up and process requests. So, keep timeouts really high on local, so that tests run reliably locally

// So, if not in CI, keep the timers high, if the test is stuck somewhere and there is unnecessary wait developer can see in browser that it's stuck
const DEFAULT_NAVIGATION_TIMEOUT = process.env.CI ? 15000 : 50000;
const DEFAULT_EXPECT_TIMEOUT = process.env.CI ? 10000 : 50000;

// Test Timeout can hit due to slow expect, slow navigation.
// So, it should me much higher than sum of expect and navigation timeouts as there can be many async expects and navigations in a single test
const DEFAULT_TEST_TIMEOUT = process.env.CI ? 60000 : 120000;

const headless = !!process.env.CI || !!process.env.PLAYWRIGHT_HEADLESS;

const IS_EMBED_TEST = process.argv.some((a) => a.startsWith("--project=@calcom/embed-core"));

const webServer: PlaywrightTestConfig["webServer"] = [
  {
    command: "NEXT_PUBLIC_IS_E2E=1 yarn workspace @calcom/web start -p 3000",
    port: 3000,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
];

if (IS_EMBED_TEST) {
  webServer.push({
    command: "yarn workspace @calcom/embed-core run-p 'embed-dev' 'embed-web-start'",
    port: 3100,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  });
}

const config: PlaywrightTestConfig = {
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: os.cpus().length,
  timeout: DEFAULT_TEST_TIMEOUT,
  maxFailures: headless ? 10 : undefined,
  fullyParallel: true,
  reporter: [
    [process.env.CI ? "github" : "list"],
    ["@deploysentinel/playwright"],
    ["html", { outputFolder: "./test-results/reports/playwright-html-report", open: "never" }],
    ["junit", { outputFile: "./test-results/reports/results.xml" }],
  ],
  outputDir: path.join(outputDir, "results"),
  webServer,
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
      testMatch: /.*\.e2e\.tsx?/,
      expect: {
        timeout: DEFAULT_EXPECT_TIMEOUT,
      },
      use: {
        ...devices["Desktop Chrome"],
        /** If navigation takes more than this, then something's wrong, let's fail fast. */
        navigationTimeout: DEFAULT_NAVIGATION_TIMEOUT,
      },
    },
    {
      name: "@calcom/app-store",
      testDir: "./packages/app-store/",
      testMatch: /.*\.e2e\.tsx?/,
      expect: {
        timeout: DEFAULT_EXPECT_TIMEOUT,
      },
      use: {
        ...devices["Desktop Chrome"],
        /** If navigation takes more than this, then something's wrong, let's fail fast. */
        navigationTimeout: DEFAULT_NAVIGATION_TIMEOUT,
      },
    },
    {
      name: "@calcom/embed-core",
      testDir: "./packages/embeds/",
      testMatch: /.*\.e2e\.tsx?/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "@calcom/embed-core--firefox",
      testDir: "./packages/embeds/",
      testMatch: /.*\.e2e\.tsx?/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "@calcom/embed-core--webkit",
      testDir: "./packages/embeds/",
      testMatch: /.*\.e2e\.tsx?/,
      use: { ...devices["Desktop Safari"] },
    },
  ],
};

export default config;
