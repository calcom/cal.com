import * as os from "node:os";
import * as path from "node:path";
import process from "node:process";
import { WEBAPP_URL } from "@calcom/lib/constants";
import type { Frame, PlaywrightTestConfig } from "@playwright/test";
import { devices, expect } from "@playwright/test";
import dotEnv from "dotenv";

dotEnv.config({ path: ".env" });

const outputDir = path.join(__dirname, "test-results");

// Dev Server on local can be slow to start up and process requests. So, keep timeouts really high on local, so that tests run reliably locally

// So, if not in CI, keep the timers high, if the test is stuck somewhere and there is unnecessary wait developer can see in browser that it's stuck
const DEFAULT_NAVIGATION_TIMEOUT = process.env.CI ? 10000 : 120000;
const DEFAULT_EXPECT_TIMEOUT = process.env.CI ? 10000 : 120000;
const DEFAULT_ACTION_TIMEOUT = process.env.CI ? 10000 : 120000;

// Test Timeout can hit due to slow expect, slow navigation.
// So, it should me much higher than sum of expect and navigation timeouts as there can be many async expects and navigations in a single test
const DEFAULT_TEST_TIMEOUT = process.env.CI ? 60000 : 240000;

const headless = !!process.env.CI || !!process.env.PLAYWRIGHT_HEADLESS;

const IS_EMBED_TEST = process.argv.some((a) => a.startsWith("--project=@calcom/embed-core"));
const IS_EMBED_REACT_TEST = process.argv.some((a) => a.startsWith("--project=@calcom/embed-react"));

// Suppress all webServer logs to reduce noise during E2E tests
const webServer: PlaywrightTestConfig["webServer"] = [
  {
    command:
      "yarn workspace @calcom/web copy-app-store-static && NEXT_PUBLIC_IS_E2E=1 NODE_OPTIONS='--dns-result-order=ipv4first' yarn workspace @calcom/web start -p 3000",
    port: 3000,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "ignore",
  },
];

if (IS_EMBED_TEST) {
  ensureAppServerIsReadyToServeEmbed(webServer[0]);

  webServer.push({
    command: "yarn workspace @calcom/embed-core dev",
    port: 3100,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "ignore",
  });
}

if (IS_EMBED_REACT_TEST) {
  ensureAppServerIsReadyToServeEmbed(webServer[0]);

  webServer.push({
    command: "yarn workspace @calcom/embed-react dev",
    port: 3101,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "ignore",
  });
}

const DEFAULT_CHROMIUM: NonNullable<PlaywrightTestConfig["projects"]>[number]["use"] = {
  ...devices["Desktop Chrome"],
  timezoneId: "Europe/London",
  storageState: {
    cookies: [
      {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error TS definitions for USE are wrong.
        url: WEBAPP_URL,
        name: "calcom-timezone-dialog",
        expires: -1,
        value: "1",
      },
    ],
  },
  locale: "en-US",
  /** If navigation takes more than this, then something's wrong, let's fail fast. */
  navigationTimeout: DEFAULT_NAVIGATION_TIMEOUT,
  /** Global timeout for page actions (click, fill, etc.) on CI */
  actionTimeout: DEFAULT_ACTION_TIMEOUT,
  // chromium-specific permissions - Chromium seems to be the only browser type that requires perms
  contextOptions: {
    permissions: ["clipboard-read", "clipboard-write"],
  },
};

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
    [process.env.CI ? "blob" : "list"],
    ["html", { outputFolder: "./test-results/reports/playwright-html-report", open: "never" }],
    ["junit", { outputFile: "./test-results/reports/results.xml" }],
  ],
  outputDir: path.join(outputDir, "results"),
  webServer,
  use: {
    baseURL: process.env.NEXT_PUBLIC_WEBAPP_URL,
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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error TS definitions for USE are wrong.
      use: DEFAULT_CHROMIUM,
    },
    {
      name: "@calcom/app-store",
      testDir: "./packages/app-store/",
      testMatch: /.*\.e2e\.tsx?/,
      expect: {
        timeout: DEFAULT_EXPECT_TIMEOUT,
      },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error TS definitions for USE are wrong.
      use: DEFAULT_CHROMIUM,
    },
    {
      name: "@calcom/embed-core",
      testDir: "./packages/embeds/embed-core/",
      testMatch: /.*\.e2e\.tsx?/,
      expect: {
        timeout: DEFAULT_EXPECT_TIMEOUT,
      },
      use: {
        ...devices["Desktop Chrome"],
        locale: "en-US",
        baseURL: "http://localhost:3100/",
      },
    },
    {
      name: "@calcom/embed-react",
      testDir: "./packages/embeds/embed-react/",
      expect: {
        timeout: DEFAULT_EXPECT_TIMEOUT,
      },
      testMatch: /.*\.e2e\.tsx?/,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error TS definitions for USE are wrong.
      use: {
        ...DEFAULT_CHROMIUM,
        baseURL: "http://localhost:3101/",
      },
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
    {
      name: "@calcom/embed-core--isMobile",
      testDir: "./packages/embeds/embed-core/",
      testMatch: /.*\.e2e\.tsx?/,
      expect: {
        timeout: DEFAULT_EXPECT_TIMEOUT,
      },
      use: { ...devices["iPhone 13"] },
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
    expectedUrlDetails: ExpectedUrlDetails = {},
    isPrerendered?: boolean
  ) {
    if (!iframe || !iframe.url) {
      return {
        pass: false,
        message: () => `Expected to provide an iframe, got ${iframe}`,
      };
    }

    const u = new URL(iframe.url());

    const pathname = u.pathname;
    if (expectedUrlDetails.pathname) {
      const expectedPathname = `${expectedUrlDetails.pathname}/embed`;
      if (pathname !== expectedPathname) {
        return {
          pass: false,
          message: () => `Expected pathname to be ${expectedPathname} but got ${pathname}`,
        };
      }
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

    const frameElement = await iframe.frameElement();

    if (isPrerendered) {
      if (await frameElement.isVisible()) {
        return {
          pass: false,
          message: () => `Expected prerender iframe to be not visible`,
        };
      }
      return {
        pass: true,
        message: () => `is prerendered`,
      };
    }

    const iframeReadyEventDetail = await new Promise(async (resolve) => {
      const iframeReadyCheckInterval = setInterval(async () => {
        const iframeReadyEventDetail = await getActionFiredDetails({
          calNamespace,
          actionType: "linkReady",
        });
        if (iframeReadyEventDetail) {
          clearInterval(iframeReadyCheckInterval);
          resolve(iframeReadyEventDetail);
        }
      }, 500);
    });

    if (!(await frameElement.isVisible())) {
      return {
        pass: false,
        message: () => `Expected iframe to be visible`,
      };
    }

    //At this point we know that window.initialBodyVisibility would be set as DOM would already have been ready(because linkReady event can only fire after that)
    const {
      visibility: visibilityBefore,
      background: backgroundBefore,
      initialValuesSet,
    } = await iframe.evaluate(() => {
      return {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-expect-error
        visibility: window.initialBodyVisibility,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-expect-error
        background: window.initialBodyBackground,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-expect-error
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

function ensureAppServerIsReadyToServeEmbed(webServer: { port?: number; url?: string }) {
  // We shouldn't depend on an embed dependency for App's tests. So, conditionally modify App webServer.
  // Only one of port or url can be specified, so remove port.
  delete webServer.port;
  webServer.url = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/embed/embed.js`;
  console.log("Ensuring that /embed/embed.js is 200 before starting tests");
}
