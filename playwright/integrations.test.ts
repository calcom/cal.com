import { expect, test } from "@playwright/test";

import { WEBHOOK_TRIGGER_EVENTS } from "../lib/webhooks/constants";
import { createHttpServer, Request, todo } from "./lib/testUtils";

function removeDynamicProps(body: any) {
  // remove dynamic properties that differs depending on where you run the tests
  const dynamic = "[redacted/dynamic]";
  body.createdAt = dynamic;
  body.payload.startTime = dynamic;
  body.payload.endTime = dynamic;
  body.payload.location = dynamic;
  for (const attendee of body.payload.attendees) {
    attendee.timeZone = dynamic;
    if (attendee.id) attendee.id = dynamic;
    if (attendee.bookingId) attendee.bookingId = dynamic;
  }
  body.payload.organizer.timeZone = dynamic;
  body.payload.uid = dynamic;
  body.payload.additionInformation = dynamic;
  return body;
}

function findRequest(requestList: Request[], triggerEvent: typeof WEBHOOK_TRIGGER_EVENTS[number]) {
  return requestList.find(
    (r) =>
      r.body &&
      typeof r.body === "object" &&
      "triggerEvent" in r.body &&
      (r.body as any).triggerEvent === triggerEvent
  );
}

test.describe("integrations", () => {
  test.use({ storageState: "playwright/artifacts/proStorageState.json" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/integrations");
  });

  todo("Can add Zoom integration");

  todo("Can add Google Calendar");

  todo("Can add Office 365 Calendar");

  todo("Can add CalDav Calendar");

  todo("Can add Apple Calendar");
});

test.describe("Webhooks", () => {
  test.use({ storageState: "playwright/artifacts/proStorageState.json" });

  let webhookReceiver: ReturnType<typeof createHttpServer>;

  test.beforeAll(() => {
    webhookReceiver = createHttpServer();
  });

  test("Can add webhooks", async ({ page }) => {
    await page.goto("/integrations");
    // --- add webhook
    await page.click('[data-testid="new_webhook"]');
    expect(page.locator(`[data-testid='WebhookDialogForm']`)).toBeVisible();

    await page.fill('[name="subscriberUrl"]', webhookReceiver.url);

    await page.click("[type=submit]");

    await page.waitForSelector(`text=Webhook created successfully!`);

    // dialog is closed
    expect(page.locator(`[data-testid='WebhookDialogForm']`)).not.toBeVisible();
    // page contains the url
    expect(page.locator(`text='${webhookReceiver.url}'`)).toBeDefined();
  });

  //   test.describe.parallel("Booking events", () => {
  test("BOOKING_CREATED is triggered", async ({ page }, testInfo) => {
    // --- Book the first available day next month in the pro user's "30min"-event
    await page.goto(`/pro/30min`);
    await page.click('[data-testid="incrementMonth"]');
    await page.click('[data-testid="day"][data-disabled="false"]');
    await page.click('[data-testid="time"]');

    // --- fill form
    await page.fill('[name="name"]', "Test Testson");
    await page.fill('[name="email"]', "test@example.com");
    await page.press('[name="email"]', "Enter");

    await page.waitForNavigation({
      url(url) {
        return url.pathname.endsWith("/success");
      },
    });

    // --- check that webhook was called
    const request = findRequest(webhookReceiver.requestList, "BOOKING_CREATED");
    if (!request) throw Error("No request found for 'BOOKING_CREATED'");

    const body = removeDynamicProps(request.body);
    // if we change the shape of our webhooks, we can simply update this by clicking `u`
    // console.log("BODY", body);
    // Text files shouldn't have platform specific suffixes
    testInfo.snapshotSuffix = "";
    expect(JSON.stringify(body)).toMatchSnapshot(`BOOKING_CREATED-webhook-payload.txt`);
  });

  test("BOOKING_CONFIRMED is triggered", async ({ page }, testInfo) => {
    // --- Book the first available day next month in the pro user's "30min"-event
    await page.goto(`/pro/opt-in`);
    await page.click('[data-testid="incrementMonth"]');
    await page.click('[data-testid="day"][data-disabled="false"]');
    await page.click('[data-testid="time"]');

    // --- fill form
    await page.fill('[name="name"]', "Test Testson");
    await page.fill('[name="email"]', "test@example.com");
    await page.press('[name="email"]', "Enter");

    await page.waitForNavigation({
      url(url) {
        return url.pathname.endsWith("/success");
      },
    });

    // Go to bookings to confirm it
    await page.goto(`/bookings`);

    // Confirm the booking
    await page.click('[data-testid="confirm"]');

    // Wait for the success message
    await page.waitForSelector(`text=Booking Confirmed`);

    const request = findRequest(webhookReceiver.requestList, "BOOKING_CONFIRMED");
    if (!request) throw Error("No request found for 'BOOKING_CONFIRMED'");

    const body = removeDynamicProps(request.body);
    // if we change the shape of our webhooks, we can simply update this by clicking `u`
    // console.log("BODY", body);
    // Text files shouldn't have platform specific suffixes
    testInfo.snapshotSuffix = "";
    expect(JSON.stringify(body)).toMatchSnapshot(`BOOKING_CONFIRMED-webhook-payload.txt`);
  });
  //   });

  test.afterAll(() => {
    webhookReceiver.close();
  });
});
