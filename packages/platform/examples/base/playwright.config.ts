import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

const envPath = process.env.CI ? path.resolve(__dirname, ".env") : path.resolve(__dirname, ".env.local");

dotenv.config({ path: envPath });

const DEFAULT_EXPECT_TIMEOUT = process.env.CI ? 30000 : 120000;
const DEFAULT_TEST_TIMEOUT = process.env.CI ? 60000 : 240000;

const headless = !!process.env.CI || !!process.env.PLAYWRIGHT_HEADLESS;

export default defineConfig({
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: DEFAULT_TEST_TIMEOUT,
  fullyParallel: false,
  reporter: [
    ["list"],
    ["html", { outputFolder: "./test-results/reports/playwright-html-report", open: "never" }],
  ],
  outputDir: "./test-results/results",
  use: {
    baseURL: "http://localhost:4322",
    locale: "en-US",
    trace: "retain-on-failure",
    headless,
  },
  projects: [
    {
      name: "@calcom/base",
      testDir: "./tests",
      testMatch: /.*\.e2e\.tsx?/,
      expect: {
        timeout: DEFAULT_EXPECT_TIMEOUT,
      },
      use: {
        ...devices["Desktop Chrome"],
        locale: "en-US",
      },
    },
  ],
  webServer: {
    command: process.env.CI
      ? `yarn workspace @calcom/atoms dev-on && yarn workspace @calcom/atoms build && rm -f prisma/dev.db && yarn prisma db push && NEXT_PUBLIC_IS_E2E=1 NODE_ENV=test NEXT_PUBLIC_X_CAL_ID="${process.env.ATOMS_E2E_OAUTH_CLIENT_ID}" X_CAL_SECRET_KEY="${process.env.ATOMS_E2E_OAUTH_CLIENT_SECRET}" NEXT_PUBLIC_CALCOM_API_URL="${process.env.ATOMS_E2E_API_URL}" VITE_BOOKER_EMBED_OAUTH_CLIENT_ID="${process.env.ATOMS_E2E_OAUTH_CLIENT_ID_BOOKER_EMBED}" VITE_BOOKER_EMBED_API_URL="${process.env.ATOMS_E2E_API_URL}" ORGANIZATION_ID=${process.env.ATOMS_E2E_ORG_ID} yarn dev:e2e`
      : `rm -f prisma/dev.db && yarn prisma db push && yarn dev:e2e`,
    url: "http://localhost:4322",
    timeout: 600_000,
    reuseExistingServer: !process.env.CI,
  },
});
