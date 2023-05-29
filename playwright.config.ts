import type { Frame, PlaywrightTestConfig } from "@playwright/test";
import { devices, expect } from "@playwright/test";
import dotEnv from "dotenv";
import * as os from "os";
import * as path from "path";

dotEnv.config({ path: ".env" });

const outputDir = path.join(__dirname, "test-results");

// Dev Server on local can be slow to start up and process requests. So, keep timeouts really high on local, so that tests run reliably locally

// So, if not in CI, keep the timers high, if the test is stuck somewhere and there is unnecessary wait developer can see in browser that it's stuck
const DEFAULT_NAVIGATION_TIMEOUT = process.env.CI ? 15000 : 120000;
const DEFAULT_EXPECT_TIMEOUT = process.env.CI ? 15000 : 120000;

// Test Timeout can hit due to slow expect, slow navigation.
// So, it should me much higher than sum of expect and navigation timeouts as there can be many async expects and navigations in a single test
const DEFAULT_TEST_TIMEOUT = process.env.CI ? 60000 : 240000;

const headless = !!process.env.CI || !!process.env.PLAYWRIGHT_HEADLESS;

const IS_EMBED_TEST = process.argv.some((a) => a.startsWith("--project=@calcom/embed-core"));
const IS_EMBED_REACT_TEST = process.argv.some((a) => a.startsWith("--project=@calcom/embed-react"));

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
    command: "yarn workspace @calcom/embed-core dev",
    port: 3100,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  });
}

if (IS_EMBED_REACT_TEST) {
  webServer.push({
    command: "yarn workspace @calcom/embed-react dev",
    port: 3101,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  });
}

const config: PlaywrightTestConfig = {
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // While debugging it should be focussed mode
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  workers: process.env.PWDEBUG ? 1 : os.cpus().length,
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
      testDir: "./packages/embeds/embed-core/",
      testMatch: /.*\.(e2e|test)\.tsx?/,
      expect: {
        timeout: DEFAULT_EXPECT_TIMEOUT,
      },
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3100/" },
    },
    {
      name: "@calcom/embed-react",
      testDir: "./packages/embeds/embed-react/",
      expect: {
        timeout: DEFAULT_EXPECT_TIMEOUT,
      },
      testMatch: /.*\.(e2e|test)\.tsx?/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3101/" },
    },
    {
      name: "@calcom/embed-core--firefox",
      testDir: "./packages/embeds/",
      testMatch: /.*\.e2e\.tsx?/,
      expect: {
        timeout: DEFAULT_EXPECT_TIMEOUT,
      },
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "@calcom/embed-core--webkit",
      testDir: "./packages/embeds/",
      testMatch: /.*\.e2e\.tsx?/,
      expect: {
        timeout: DEFAULT_EXPECT_TIMEOUT,
      },
      use: { ...devices["Desktop Safari"] },
    },
  ],
};

export type ExpectedUrlDetails = {
  searchParams?: Record<string, string | string[]>;
  pathname?: string;
  origin?: string;
};

expect.extend({
  async toBeEmbedCalLink(
    iframe: Frame,
    calNamespace: string,
    //TODO: Move it to testUtil, so that it doesn't need to be passed
    // eslint-disable-next-line
    getActionFiredDetails: (a: { calNamespace: string; actionType: string }) => Promise<any>,
    expectedUrlDetails: ExpectedUrlDetails = {}
  ) {
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
    const expectedPathname = expectedUrlDetails.pathname + "/embed";
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
    for (const [expectedKey, expectedValue] of Object.entries(expectedSearchParams)) {
      const value = searchParams.get(expectedKey);
      if (value !== expectedValue) {
        return {
          message: () => `${expectedKey} should have value ${expectedValue} but got value ${value}`,
          pass: false,
        };
      }
    }
    let iframeReadyCheckInterval;
    const iframeReadyEventDetail = await new Promise(async (resolve) => {
      iframeReadyCheckInterval = setInterval(async () => {
        const iframeReadyEventDetail = await getActionFiredDetails({
          calNamespace,
          actionType: "linkReady",
        });
        if (iframeReadyEventDetail) {
          resolve(iframeReadyEventDetail);
        }
      }, 500);
    });

    clearInterval(iframeReadyCheckInterval);

    //At this point we know that window.initialBodyVisibility would be set as DOM would already have been ready(because linkReady event can only fire after that)
    const {
      visibility: visibilityBefore,
      background: backgroundBefore,
      initialValuesSet,
    } = await iframe.evaluate(() => {
      return {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        visibility: window.initialBodyVisibility,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        background: window.initialBodyBackground,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        initialValuesSet: window.initialValuesSet,
      };
    });
    expect(initialValuesSet).toBe(true);
    expect(visibilityBefore).toBe("hidden");
    expect(backgroundBefore).toBe("transparent");

    const { visibility: visibilityAfter, background: backgroundAfter } = await iframe.evaluate(() => {
      return {
        visibility: document.body.style.visibility,
        background: document.body.style.background,
      };
    });

    expect(visibilityAfter).toBe("visible");
    expect(backgroundAfter).toBe("transparent");
    if (!iframeReadyEventDetail) {
      return {
        pass: false,
        message: () => `Iframe not ready to communicate with parent`,
      };
    }

    return {
      pass: true,
      message: () => `passed`,
    };
  },
});

export default config;
