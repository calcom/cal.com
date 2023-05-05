import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { createHttpServer, selectFirstAvailableTimeSlotNextMonth, waitFor } from "./lib/testUtils";

test.afterEach(({ users }) => users.deleteAll());

test("add webhook & test that creating an event triggers a webhook call", async ({
  page,
  users,
}, testInfo) => {
  const webhookReceiver = createHttpServer();
  const user = await users.create();
  const [eventType] = user.eventTypes;
  await user.login();
  await page.goto(`/settings/developer/webhooks`);

  // --- add webhook
  await page.click('[data-testid="new_webhook"]');

  await page.fill('[name="subscriberUrl"]', webhookReceiver.url);

  await page.fill('[name="secret"]', "secret");

  await Promise.all([
    page.click("[type=submit]"),
    page.waitForURL((url) => url.pathname.endsWith("/settings/developer/webhooks")),
  ]);

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
  body.payload.organizer.id = dynamic;
  body.payload.organizer.email = dynamic;
  body.payload.organizer.timeZone = dynamic;
  body.payload.organizer.language = dynamic;
  body.payload.uid = dynamic;
  body.payload.bookingId = dynamic;
  body.payload.additionalInformation = dynamic;
  body.payload.requiresConfirmation = dynamic;
  body.payload.eventTypeId = dynamic;
  body.payload.videoCallData = dynamic;
  body.payload.appsStatus = dynamic;
  body.payload.metadata.videoCallUrl = dynamic;

  expect(body).toMatchObject({
    triggerEvent: "BOOKING_CREATED",
    createdAt: "[redacted/dynamic]",
    payload: {
      type: "30 min",
      title: "30 min between Nameless and Test Testson",
      description: "",
      additionalNotes: "",
      customInputs: {},
      startTime: "[redacted/dynamic]",
      endTime: "[redacted/dynamic]",
      organizer: {
        id: "[redacted/dynamic]",
        name: "Nameless",
        email: "[redacted/dynamic]",
        timeZone: "[redacted/dynamic]",
        language: "[redacted/dynamic]",
      },
      responses: {
        email: {
          value: "test@example.com",
          label: "email_address",
        },
        name: {
          value: "Test Testson",
          label: "your_name",
        },
      },
      userFieldsResponses: {},
      attendees: [
        {
          email: "test@example.com",
          name: "Test Testson",
          timeZone: "[redacted/dynamic]",
          language: "[redacted/dynamic]",
        },
      ],
      location: "[redacted/dynamic]",
      destinationCalendar: null,
      hideCalendarNotes: false,
      requiresConfirmation: "[redacted/dynamic]",
      eventTypeId: "[redacted/dynamic]",
      seatsShowAttendees: true,
      seatsPerTimeSlot: null,
      uid: "[redacted/dynamic]",
      eventTitle: "30 min",
      eventDescription: null,
      price: 0,
      currency: "usd",
      length: 30,
      bookingId: "[redacted/dynamic]",
      metadata: { videoCallUrl: "[redacted/dynamic]" },
      status: "ACCEPTED",
      additionalInformation: "[redacted/dynamic]",
    },
  });

  webhookReceiver.close();
});
