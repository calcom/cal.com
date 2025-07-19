import type { Page, Route } from "@playwright/test";
import { expect } from "@playwright/test";
import type { DefaultBodyType } from "msw";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { v4 as uuidv4 } from "uuid";

import { prisma } from "@calcom/prisma";

import { test } from "./lib/fixtures";
import { submitAndWaitForJsonResponse } from "./lib/testUtils";

declare let global: {
  E2E_EMAILS?: ({ text: string } | Record<string, unknown>)[];
};

const requestInterceptor = setupServer(
  rest.post("https://api.hubapi.com/oauth/v1/token", (req, res, ctx) => {
    console.log(req.body);
    return res(ctx.status(200));
  })
);

const addOauthBasedIntegration = async function ({
  page,
  slug,
  authorization,
  token,
}: {
  page: Page;
  slug: string;
  authorization: {
    url: string;
    verify: (config: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requestHeaders: any;
      params: URLSearchParams;
      code: string;
    }) => Parameters<Route["fulfill"]>[0];
  };
  token: {
    url: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    verify: (config: { requestHeaders: any; params: URLSearchParams; code: string }) => {
      status: number;
      body: DefaultBodyType;
    };
  };
}) {
  const code = uuidv4();
  // Note the difference b/w MSW wildcard and Playwright wildards. Playwright requires query params to be explicitly specified.
  page.route(`${authorization.url}?**`, (route, request) => {
    const u = new URL(request.url());
    const result = authorization.verify({
      requestHeaders: request.allHeaders(),
      params: u.searchParams,
      code,
    });

    return route.fulfill(result);
  });
  requestInterceptor.use(
    rest.post(token.url, (req, res, ctx) => {
      const params = new URLSearchParams(req.body as string);
      const result = token.verify({ requestHeaders: req.headers, params, code });

      return res(ctx.status(result.status), ctx.json(result.body));
    })
  );

  await page.goto(`/apps/${slug}`);
  await page.click('[data-testid="install-app-button"]');
};

const addLocationIntegrationToFirstEvent = async function ({ user }: { user: { username: string | null } }) {
  const eventType = await prisma.eventType.findFirst({
    where: {
      users: {
        some: {
          username: user.username,
        },
      },
      price: 0,
    },
  });

  if (!eventType) {
    throw new Error("Event type not found");
  }
  await prisma.eventType.update({
    where: {
      id: eventType.id,
    },
    data: {
      locations: [{ type: "integrations:zoom" }],
    },
  });
  return eventType;
};

async function bookEvent(page: Page, calLink: string) {
  // Let current month dates fully render.
  // There is a bug where if we don't let current month fully render and quickly click go to next month, current month gets rendered
  // This doesn't seem to be replicable with the speed of a person, only during automation.
  // It would also allow correct snapshot to be taken for current month.
  // eslint-disable-next-line playwright/no-wait-for-timeout
  await page.waitForTimeout(1000);
  await page.goto(`/${calLink}`);

  await page.locator('[data-testid="day"][data-disabled="false"]').nth(0).click();
  page.locator('[data-testid="time"]').nth(0).click();
  await page.waitForNavigation({
    url(url) {
      return url.pathname.includes("/book");
    },
  });
  const meetingId = 123456789;

  requestInterceptor.use(
    rest.post("https://api.zoom.us/v2/users/me/meetings", (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          id: meetingId,
          password: "TestPass",
          join_url: `https://zoom.us/j/${meetingId}`,
        })
      );
    })
  );
  // --- fill form
  await page.fill('[name="name"]', "Integration User");
  await page.fill('[name="email"]', "integration-user@example.com");

  const response = await submitAndWaitForJsonResponse(page, "**/api/book/event", {
    action: () => page.press('[name="email"]', "Enter"),
  });
  const responseObj = await response.json();
  const bookingId = responseObj.uid;
  await page.waitForSelector("[data-testid=success-page]");
  // Make sure we're navigated to the success page
  await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  expect(global.E2E_EMAILS?.length).toBe(2);
  expect(
    global.E2E_EMAILS?.every((email) => (email.text as string).includes(`https://zoom.us/j/${meetingId}`))
  ).toBe(true);
  return bookingId;
}

test.describe.configure({ mode: "parallel" });

// Enable API mocking before tests.
test.beforeAll(() =>
  requestInterceptor.listen({
    // Comment this to log which all requests are going that are unmocked
    onUnhandledRequest: "bypass",
  })
);

// Reset any runtime request handlers we may add during the tests.
test.afterEach(() => requestInterceptor.resetHandlers());

// Disable API mocking after the tests are done.
test.afterAll(() => requestInterceptor.close());
test.afterEach(({ users }) => users.deleteAll());
