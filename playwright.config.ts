import type { PlaywrightTestConfig } from "@playwright/test";
import { devices } from "@playwright/test";
import dotEnv from "dotenv";
import * as os from "os";
import * as path from "path";

dotEnv.config({ path: ".env" });

const outputDir = path.join(__dirname, "test-results");

const DEFAULT_NAVIGATION_TIMEOUT = 15000;

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
  timeout: 60_000,
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
