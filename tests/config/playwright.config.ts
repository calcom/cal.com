import { PlaywrightTestConfig, devices } from "@playwright/test";
import { addAliases } from "module-alias";
import * as path from "path";

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

const outputDir = path.join(__dirname, "..", "..", "test-results");
const testDir = path.join(__dirname, "..", "..", "apps/web/playwright");

const config: PlaywrightTestConfig = {
  forbidOnly: !!process.env.CI,
  timeout: 60_000,
  reporter: [
    [process.env.CI ? "github" : "list"],
    ["html", { outputFolder: "./playwright/reports/playwright-html-report", open: "never" }],
    ["junit", { outputFile: "./playwright/reports/results.xml" }],
  ],
  globalSetup: require.resolve("./globalSetup"),
  outputDir,
  webServer: {
    command: "yarn workspace @calcom/web start -p 3000",
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
