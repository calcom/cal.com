import { expect } from "@playwright/test";

import test from "./lib/fixtures";
import * as teardown from "./lib/teardown";
import { createHttpServer, selectFirstAvailableTimeSlotNextMonth, todo, waitFor } from "./lib/testUtils";

test.describe("integrations", () => {
  //teardown
  test.afterAll(async () => {
    await teardown.deleteAllWebhooksByEmail("pro@example.com");
    await teardown.deleteAllBookingsByEmail("pro@example.com");
  });
  test.use({ storageState: "playwright/artifacts/proStorageState.json" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/integrations");
  });

  test.describe("Zoom App", () => {
    async function addZoomIntegration({ page, requestInterceptor, rest }) {
      page.route(`https://zoom.us/oauth/authorize?**`, (route, request) => {
        const u = new URL(request.url());
        const redirectTo = u.searchParams.get("redirect_uri");
        if (!redirectTo) {
          throw new Error("Zoom: No redirect_uri");
        }
        return route.fulfill({
          // TODO: Should
          status: 307,
          headers: {
            location: `${redirectTo}?code=ZOOM_AUTH_CODE`,
          },
        });
      });

      //TODO: Add Basic auth check
      requestInterceptor.use(
        rest.post("https://zoom.us/oauth/*", async (req, res, ctx) => {
          const authorization = req.headers.get("authorization");
          const clientPair = Buffer.from(authorization, "base64").toString();
          const [clientId, clientSecret] = clientPair.split(":");
          if (clientId !== process.env.ZOOM_CLIENT_ID || clientSecret != process.env.ZOOM_CLIENT_SECRET) {
            return res(ctx.status(400));
          }
          return res(
            ctx.status(200),
            ctx.json({
              access_token:
                "eyJhbGciOiJIUzUxMiIsInYiOiIyLjAiLCJraWQiOiI8S0lEPiJ9.eyJ2ZXIiOiI2IiwiY2xpZW50SWQiOiI8Q2xpZW50X0lEPiIsImNvZGUiOiI8Q29kZT4iLCJpc3MiOiJ1cm46em9vbTpjb25uZWN0OmNsaWVudGlkOjxDbGllbnRfSUQ-IiwiYXV0aGVudGljYXRpb25JZCI6IjxBdXRoZW50aWNhdGlvbl9JRD4iLCJ1c2VySWQiOiI8VXNlcl9JRD4iLCJncm91cE51bWJlciI6MCwiYXVkIjoiaHR0cHM6Ly9vYXV0aC56b29tLnVzIiwiYWNjb3VudElkIjoiPEFjY291bnRfSUQ-IiwibmJmIjoxNTgwMTQ2OTkzLCJleHAiOjE1ODAxNTA1OTMsInRva2VuVHlwZSI6ImFjY2Vzc190b2tlbiIsImlhdCI6MTU4MDE0Njk5MywianRpIjoiPEpUST4iLCJ0b2xlcmFuY2VJZCI6MjV9.F9o_w7_lde4Jlmk_yspIlDc-6QGmVrCbe_6El-xrZehnMx7qyoZPUzyuNAKUKcHfbdZa6Q4QBSvpd6eIFXvjHw",
              token_type: "bearer",
              refresh_token:
                "eyJhbGciOiJIUzUxMiIsInYiOiIyLjAiLCJraWQiOiI8S0lEPiJ9.eyJ2ZXIiOiI2IiwiY2xpZW50SWQiOiI8Q2xpZW50X0lEPiIsImNvZGUiOiI8Q29kZT4iLCJpc3MiOiJ1cm46em9vbTpjb25uZWN0OmNsaWVudGlkOjxDbGllbnRfSUQ-IiwiYXV0aGVudGljYXRpb25JZCI6IjxBdXRoZW50aWNhdGlvbl9JRD4iLCJ1c2VySWQiOiI8VXNlcl9JRD4iLCJncm91cE51bWJlciI6MCwiYXVkIjoiaHR0cHM6Ly9vYXV0aC56b29tLnVzIiwiYWNjb3VudElkIjoiPEFjY291bnRfSUQ-IiwibmJmIjoxNTgwMTQ2OTkzLCJleHAiOjIwNTMxODY5OTMsInRva2VuVHlwZSI6InJlZnJlc2hfdG9rZW4iLCJpYXQiOjE1ODAxNDY5OTMsImp0aSI6IjxKVEk-IiwidG9sZXJhbmNlSWQiOjI1fQ.Xcn_1i_tE6n-wy6_-3JZArIEbiP4AS3paSD0hzb0OZwvYSf-iebQBr0Nucupe57HUDB5NfR9VuyvQ3b74qZAfA",
              expires_in: 3599,
              scope: "user:read:admin",
            })
          );
        })
      );
      await page.click('[data-testid="zoom_video-integration-connection-button"]');
    }
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

    test("Can add integration", async ({ page, requestInterceptor, rest }) => {
      await addZoomIntegration({ page, requestInterceptor, rest });
      await page.waitForNavigation({
        url: (url) => {
          return url.pathname === "/integrations";
        },
      });
      //TODO: Check that disconnect button is now visible
    });

    test("Can disconnect from integration", async ({ page, requestInterceptor, rest }) => {
      await addZoomIntegration({ page, requestInterceptor, rest });
      await page.waitForNavigation({
        url: (url) => {
          return url.pathname === "/integrations";
        },
      });
      await page.locator('[data-testid="zoom_video-integration-disconnect-button"]').click();
      await page.locator('[data-testid="confirm-button"]').click();
      await expect(page.locator('[data-testid="confirm-integration-disconnect-button"]')).toHaveCount(0);
    });
  });

  todo("Can add Google Calendar");

  todo("Can add Office 365 Calendar");

  todo("Can add CalDav Calendar");

  todo("Can add Apple Calendar");

  test("add webhook & test that creating an event triggers a webhook call", async ({ page }, testInfo) => {
    const webhookReceiver = createHttpServer();

    // --- add webhook
    await page.click('[data-testid="new_webhook"]');

    await expect(page.locator(`[data-testid='WebhookDialogForm']`)).toBeVisible();

    await page.fill('[name="subscriberUrl"]', webhookReceiver.url);

    await page.click("[type=submit]");

    // dialog is closed
    await expect(page.locator(`[data-testid='WebhookDialogForm']`)).not.toBeVisible();
    // page contains the url
    expect(page.locator(`text='${webhookReceiver.url}'`)).toBeDefined();

    // --- Book the first available day next month in the pro user's "30min"-event
    await page.goto(`/pro/30min`);
    await selectFirstAvailableTimeSlotNextMonth(page);

    // --- fill form
    await page.fill('[name="name"]', "Test Testson");
    await page.fill('[name="email"]', "test@example.com");
    await page.press('[name="email"]', "Enter");

    // --- check that webhook was called
    await waitFor(() => {
      expect(webhookReceiver.requestList.length).toBe(1);
    });

    const [request] = webhookReceiver.requestList;
    const body = request.body as any;

    // remove dynamic properties that differs depending on where you run the tests
    const dynamic = "[redacted/dynamic]";
    body.createdAt = dynamic;
    body.payload.startTime = dynamic;
    body.payload.endTime = dynamic;
    body.payload.location = dynamic;
    for (const attendee of body.payload.attendees) {
      attendee.timeZone = dynamic;
      attendee.language = dynamic;
    }
    body.payload.organizer.timeZone = dynamic;
    body.payload.organizer.language = dynamic;
    body.payload.uid = dynamic;
    body.payload.additionInformation = dynamic;

    // if we change the shape of our webhooks, we can simply update this by clicking `u`
    // console.log("BODY", body);
    // Text files shouldn't have platform specific suffixes
    testInfo.snapshotSuffix = "";
    expect(JSON.stringify(body)).toMatchSnapshot(`webhookResponse.txt`);

    webhookReceiver.close();
  });
});
