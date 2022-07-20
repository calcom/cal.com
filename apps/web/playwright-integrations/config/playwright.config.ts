import { devices, PlaywrightTestConfig } from "@playwright/test";
import dotenv from "dotenv";
import { addAliases } from "module-alias";
import * as path from "path";

dotenv.config({ path: "./env" });

// Add aliases for the paths specified in the tsconfig.json file.
// This is needed because playwright does not consider tsconfig.json
// For more info, see:
// https://stackoverflow.com/questions/69023682/typescript-playwright-error-cannot-find-module
// https://github.com/microsoft/playwright/issues/7066#issuecomment-983984496
addAliases({
  "@components": __dirname + "/apps/web/components",
  "@lib": __dirname + "/apps/web/lib",
  "@server": __dirname + "/apps/web/server",
  "@ee": __dirname + "/apps/web/ee",
});

const outputDir = path.join(__dirname, "..", "test-results");
const testDir = path.join(__dirname, "..", "tests");

const DEFAULT_NAVIGATION_TIMEOUT = 600000;

const headless = !!process.env.CI || !!process.env.PLAYWRIGHT_HEADLESS;
process.env.PLAYWRIGHT_TEST_BASE_URL = "http://localhost:3000";
const quickMode = process.env.QUICK === "true";

const config: PlaywrightTestConfig = {
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: quickMode ? 1 : 1,
  timeout: 60_000,
  maxFailures: headless ? 10 : undefined,
  reporter: [
    [process.env.CI ? "github" : "list"],
    ["html", { outputFolder: path.join(outputDir, "reports/playwright-html-report"), open: "never" }],
    ["junit", { outputFile: path.join(outputDir, "reports/results.xml") }],
  ],
  outputDir,
  use: {
    baseURL: "http://localhost:3000/",
    locale: "en-US",
    trace: "retain-on-failure",
    headless,
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
