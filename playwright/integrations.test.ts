import { expect, test } from "@playwright/test";

import { createHttpServer, todo, waitFor } from "./lib/testUtils";

test.describe("integrations", () => {
  test.use({ storageState: "playwright/artifacts/proStorageState.json" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/integrations");
  });

  todo("Can add Zoom integration");

  todo("Can add Stripe integration");

  todo("Can add Google Calendar");

  todo("Can add Office 365 Calendar");

  todo("Can add CalDav Calendar");

  todo("Can add Apple Calendar");

  test("add webhook & test that creating an event triggers a webhook call", async ({ page }) => {
    const webhookReceiver = createHttpServer();

    // --- add webhook
    await page.click('[data-testid="new_webhook"]');
    expect(page.locator(`[data-testid='WebhookDialogForm']`)).toBeTruthy();

    await page.fill('[name="subscriberUrl"]', webhookReceiver.url);

    await page.click("[type=submit]");

    // dialog is closed
    expect(page.locator(`[data-testid='WebhookDialogForm']`)).toBeFalsy();
    // page contains the url
    expect(page.locator(`text='${webhookReceiver.url}'`)).toBeTruthy();

    // --- Book the first available day next month in the pro user's "30min"-event
    await page.goto(`http://localhost:3000/pro/30min`);
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
    for (const attendee of body.payload.attendees) {
      attendee.timeZone = dynamic;
    }
    body.payload.organizer.timeZone = dynamic;
    body.payload.uid = dynamic;
    body.payload.additionInformation = dynamic;

    // if we change the shape of our webhooks, we can simply update this by clicking `u`
    // console.log("BODY", body);
    expect(body).toMatchSnapshot(`
    Object {
      "createdAt": "[redacted/dynamic]",
      "payload": Object {
        "additionInformation": "[redacted/dynamic]",
        "attendees": Array [
          Object {
            "email": "test@example.com",
            "name": "Test Testson",
            "timeZone": "[redacted/dynamic]",
          },
        ],
        "description": "",
        "destinationCalendar": null,
        "endTime": "[redacted/dynamic]",
        "metadata": Object {},
        "organizer": Object {
          "email": "pro@example.com",
          "name": "Pro Example",
          "timeZone": "[redacted/dynamic]",
        },
        "startTime": "[redacted/dynamic]",
        "title": "30min between Pro Example and Test Testson",
        "type": "30min",
        "uid": "[redacted/dynamic]",
      },
      "triggerEvent": "BOOKING_CREATED",
    }
  `);

    webhookReceiver.close();
  });
});
