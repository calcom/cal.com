import { expect, test } from "@playwright/test";

import { createHttpServer, todo, waitFor } from "./lib/testUtils";

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
    await page.click('[data-testid="incrementMonth"]');
    await page.click('[data-testid="day"][data-disabled="false"]');
    await page.click('[data-testid="time"]');

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
