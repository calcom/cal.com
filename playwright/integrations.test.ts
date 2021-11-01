import dayjs from "dayjs";
import { kont } from "kont";

import { loginProvider } from "./lib/loginProvider";
import { createHttpServer, waitFor } from "./lib/testUtils";

jest.setTimeout(60e3);
jest.retryTimes(3);

describe("webhooks", () => {
  const ctx = kont()
    .useBeforeEach(
      loginProvider({
        user: "pro",
        path: "/integrations",
        waitForSelector: '[data-testid="new_webhook"]',
      })
    )
    .done();

  test("add webhook & test that creating an event triggers a webhook call", async () => {
    const { page } = ctx;
    const webhookReceiver = createHttpServer();

    // --- add webhook
    await page.click('[data-testid="new_webhook"]');
    await expect(page).toHaveSelector("[data-testid='WebhookDialogForm']");

    await page.fill('[name="subscriberUrl"]', webhookReceiver.url);

    await page.click("[type=submit]");

    // dialog is closed
    await expect(page).not.toHaveSelector("[data-testid='WebhookDialogForm']");
    // page contains the url
    await expect(page).toHaveSelector(`text='${webhookReceiver.url}'`);

    // --- go to tomorrow in the pro user's "30min"-event
    const tomorrow = dayjs().add(1, "day");
    const tomorrowFormatted = tomorrow.format("YYYY-MM-DDZZ");

    await page.goto(`http://localhost:3000/pro/30min?date=${encodeURIComponent(tomorrowFormatted)}`);

    // click first time available
    await page.click("[data-testid=time]");

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

    // if we change the shape of our webhooks, we can simply update this by clicking `u`
    // console.log("BODY", body);
    expect(body).toMatchInlineSnapshot(`
    Object {
      "createdAt": "[redacted/dynamic]",
      "payload": Object {
        "attendees": Array [
          Object {
            "email": "test@example.com",
            "name": "Test Testson",
            "timeZone": "[redacted/dynamic]",
          },
        ],
        "description": "",
        "endTime": "[redacted/dynamic]",
        "organizer": Object {
          "email": "pro@example.com",
          "name": "Pro Example",
          "timeZone": "[redacted/dynamic]",
        },
        "startTime": "[redacted/dynamic]",
        "title": "30min with Test Testson",
        "type": "30min",
        "uid": "[redacted/dynamic]",
      },
      "triggerEvent": "BOOKING_CREATED",
    }
  `);

    webhookReceiver.close();
  });
});
