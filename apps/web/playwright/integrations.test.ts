import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { createHttpServer, selectFirstAvailableTimeSlotNextMonth, todo, waitFor } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("Integrations", () => {
  todo("Can add Zoom integration");

  todo("Can add Google Calendar");

  todo("Can add Office 365 Calendar");

  todo("Can add CalDav Calendar");

  todo("Can add Apple Calendar");

  test("add webhook & test that creating an event triggers a webhook call", async ({
    page,
    users,
  }, testInfo) => {
    const webhookReceiver = createHttpServer();
    const user = await users.create();
    const [eventType] = user.eventTypes;
    await user.login();
    await page.goto("/settings/developer");

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
    await page.goto(`/${user.username}/${eventType.slug}`);
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
    body.payload.organizer.email = dynamic;
    body.payload.organizer.timeZone = dynamic;
    body.payload.organizer.language = dynamic;
    body.payload.uid = dynamic;
    body.payload.additionalInformation = dynamic;

    // if we change the shape of our webhooks, we can simply update this by clicking `u`
    // console.log("BODY", body);
    // Text files shouldn't have platform specific suffixes
    testInfo.snapshotSuffix = "";
    expect(JSON.stringify(body)).toMatchSnapshot(`webhookResponse.txt`);

    webhookReceiver.close();
  });
});
