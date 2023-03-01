import type { Page, Route } from "@playwright/test";
import { expect } from "@playwright/test";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { v4 as uuidv4 } from "uuid";

import { prisma } from "@calcom/prisma";

import { test } from "./lib/fixtures";
import { todo } from "./lib/testUtils";

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
      body: any;
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
  // There is a bug where if we don't let current month fully render and quickly click go to next month, current month get's rendered
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
  await page.press('[name="email"]', "Enter");
  const response = await page.waitForResponse("**/api/book/event");
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

// TODO: Fix MSW mocking
test.fixme("Integrations", () => {
  test.beforeEach(() => {
    global.E2E_EMAILS = [];
  });
  const addZoomIntegration = async function ({ page }: { page: Page }) {
    await addOauthBasedIntegration({
      page,
      slug: "zoom",
      authorization: {
        url: "https://zoom.us/oauth/authorize",
        verify({ params, code }) {
          expect(params.get("redirect_uri")).toBeTruthy();
          return {
            status: 307,
            headers: {
              location: `${params.get("redirect_uri")}?code=${code}`,
            },
          };
        },
      },
      token: {
        url: "https://zoom.us/oauth/token",
        verify({ requestHeaders }) {
          const authorization = requestHeaders.get("authorization").replace("Basic ", "");
          const clientPair = Buffer.from(authorization, "base64").toString();
          const [clientId, clientSecret] = clientPair.split(":");
          // Ensure that zoom credentials are passed.
          // TODO: We should also ensure that these credentials are correct e.g. in this case should be READ from DB
          expect(clientId).toBeTruthy();
          expect(clientSecret).toBeTruthy();

          return {
            status: 200,
            body: {
              access_token:
                "eyJhbGciOiJIUzUxMiIsInYiOiIyLjAiLCJraWQiOiI8S0lEPiJ9.eyJ2ZXIiOiI2IiwiY2xpZW50SWQiOiI8Q2xpZW50X0lEPiIsImNvZGUiOiI8Q29kZT4iLCJpc3MiOiJ1cm46em9vbTpjb25uZWN0OmNsaWVudGlkOjxDbGllbnRfSUQ-IiwiYXV0aGVudGljYXRpb25JZCI6IjxBdXRoZW50aWNhdGlvbl9JRD4iLCJ1c2VySWQiOiI8VXNlcl9JRD4iLCJncm91cE51bWJlciI6MCwiYXVkIjoiaHR0cHM6Ly9vYXV0aC56b29tLnVzIiwiYWNjb3VudElkIjoiPEFjY291bnRfSUQ-IiwibmJmIjoxNTgwMTQ2OTkzLCJleHAiOjE1ODAxNTA1OTMsInRva2VuVHlwZSI6ImFjY2Vzc190b2tlbiIsImlhdCI6MTU4MDE0Njk5MywianRpIjoiPEpUST4iLCJ0b2xlcmFuY2VJZCI6MjV9.F9o_w7_lde4Jlmk_yspIlDc-6QGmVrCbe_6El-xrZehnMx7qyoZPUzyuNAKUKcHfbdZa6Q4QBSvpd6eIFXvjHw",
              token_type: "bearer",
              refresh_token:
                "eyJhbGciOiJIUzUxMiIsInYiOiIyLjAiLCJraWQiOiI8S0lEPiJ9.eyJ2ZXIiOiI2IiwiY2xpZW50SWQiOiI8Q2xpZW50X0lEPiIsImNvZGUiOiI8Q29kZT4iLCJpc3MiOiJ1cm46em9vbTpjb25uZWN0OmNsaWVudGlkOjxDbGllbnRfSUQ-IiwiYXV0aGVudGljYXRpb25JZCI6IjxBdXRoZW50aWNhdGlvbl9JRD4iLCJ1c2VySWQiOiI8VXNlcl9JRD4iLCJncm91cE51bWJlciI6MCwiYXVkIjoiaHR0cHM6Ly9vYXV0aC56b29tLnVzIiwiYWNjb3VudElkIjoiPEFjY291bnRfSUQ-IiwibmJmIjoxNTgwMTQ2OTkzLCJleHAiOjIwNTMxODY5OTMsInRva2VuVHlwZSI6InJlZnJlc2hfdG9rZW4iLCJpYXQiOjE1ODAxNDY5OTMsImp0aSI6IjxKVEk-IiwidG9sZXJhbmNlSWQiOjI1fQ.Xcn_1i_tE6n-wy6_-3JZArIEbiP4AS3paSD0hzb0OZwvYSf-iebQBr0Nucupe57HUDB5NfR9VuyvQ3b74qZAfA",
              expires_in: 3599,
              // Without this permission, meeting can't be created.
              scope: "meeting:write",
            },
          };
        },
      },
    });
  };
  test.describe("Zoom App", () => {
    test.afterEach(async () => {
      await prisma?.credential.deleteMany({
        where: {
          user: {
            email: "pro@example.com",
          },
          type: "zoom_video",
        },
      });
    });

    test("Can add integration", async ({ page, users }) => {
      const user = await users.create();
      await user.login();
      await addZoomIntegration({ page });
      await page.waitForNavigation({
        url: (url) => {
          return url.pathname === "/apps/installed";
        },
      });
      //TODO: Check that disconnect button is now visible
    });

    test("can choose zoom as a location during booking", async ({ page, users }) => {
      const user = await users.create();
      await user.login();
      const eventType = await addLocationIntegrationToFirstEvent({ user });
      await addZoomIntegration({ page });
      await page.waitForNavigation({
        url: (url) => {
          return url.pathname === "/apps/installed";
        },
      });

      await bookEvent(page, `${user.username}/${eventType.slug}`);
      // Ensure that zoom was informed about the meeting
      // Verify that email had zoom link
      // POST https://api.zoom.us/v2/users/me/meetings
      // Verify       Header->  Authorization: "Bearer " + accessToken,
      /**
         * {
      topic: event.title,
      type: 2, // Means that this is a scheduled meeting
      start_time: event.startTime,
      duration: (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 60000,
      //schedule_for: "string",   TODO: Used when scheduling the meeting for someone else (needed?)
      timezone: event.attendees[0].timeZone,
      //password: "string",       TODO: Should we use a password? Maybe generate a random one?
      agenda: event.description,
      settings: {
        host_video: true,
        participant_video: true,
        cn_meeting: false, // TODO: true if host meeting in China
        in_meeting: false, // TODO: true if host meeting in India
        join_before_host: true,
        mute_upon_entry: false,
        watermark: false,
        use_pmi: false,
        approval_type: 2,
        audio: "both",
        auto_recording: "none",
        enforce_login: false,
        registrants_email_notification: true,
      },
    };
         */
    });
    test("Can disconnect from integration", async ({ page, users }) => {
      const user = await users.create();
      await user.login();
      await addZoomIntegration({ page });
      await page.waitForNavigation({
        url: (url) => {
          return url.pathname === "/apps/installed";
        },
      });

      // FIXME: First time reaching /apps/installed throws error in UI.
      // Temporary use this hack to fix it but remove this HACK before merge.
      /** HACK STARTS */
      await page.locator('[href="/apps"]').first().click();
      await page.waitForNavigation({
        url: (url) => {
          return url.pathname === "/apps";
        },
      });
      await page.locator('[href="/apps/installed"]').first().click();
      /** HACK ENDS */

      await page.locator('[data-testid="zoom_video-integration-disconnect-button"]').click();
      await page.locator('[data-testid="confirm-button"]').click();
      await expect(page.locator('[data-testid="confirm-integration-disconnect-button"]')).toHaveCount(0);
    });
  });

  test.describe("Hubspot App", () => {
    test("Can add integration", async ({ page, users }) => {
      const user = await users.create();
      await user.login();
      await addOauthBasedIntegration({
        page,
        slug: "hubspot",
        authorization: {
          url: "https://app.hubspot.com/oauth/authorize",
          verify({ params, code }) {
            expect(params.get("redirect_uri")).toBeTruthy();
            // TODO: We can check if client_id is correctly read from DB or not
            expect(params.get("client_id")).toBeTruthy();
            expect(params.get("scope")).toBe(
              ["crm.objects.contacts.read", "crm.objects.contacts.write"].join(" ")
            );

            return {
              // TODO: Should
              status: 307,
              headers: {
                location: `${params.get("redirect_uri")}?code=${code}`,
              },
            };
          },
        },
        token: {
          url: "https://api.hubapi.com/oauth/v1/token",
          verify({ params, code }) {
            expect(params.get("grant_type")).toBe("authorization_code");
            expect(params.get("code")).toBe(code);
            expect(params.get("client_id")).toBeTruthy();
            expect(params.get("client_secret")).toBeTruthy();
            return {
              status: 200,
              body: {
                expiresIn: "3600",
              },
            };
          },
        },
      });
      await page.waitForNavigation({
        url: (url) => {
          return url.pathname === "/apps/installed";
        },
      });
    });
  });

  todo("Can add Google Calendar");

  todo("Can add Office 365 Calendar");

  todo("Can add CalDav Calendar");

  todo("Can add Apple Calendar");
});
