import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import {
  bookOptinEvent,
  createHttpServer,
  selectFirstAvailableTimeSlotNextMonth,
  waitFor,
  gotoRoutingLink,
} from "./lib/testUtils";

// remove dynamic properties that differs depending on where you run the tests
const dynamic = "[redacted/dynamic]";

test.afterEach(({ users }) => users.deleteAll());

test.describe("BOOKING_CREATED", async () => {
  test("add webhook & test that creating an event triggers a webhook call", async ({
    page,
    users,
  }, _testInfo) => {
    const webhookReceiver = createHttpServer();
    const user = await users.create();
    const [eventType] = user.eventTypes;
    await user.apiLogin();
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = request.body;

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
});

test.describe("BOOKING_REJECTED", async () => {
  test("can book an event that requires confirmation and then that booking can be rejected by organizer", async ({
    page,
    users,
  }) => {
    const webhookReceiver = createHttpServer();
    // --- create a user
    const user = await users.create();

    // --- visit user page
    await page.goto(`/${user.username}`);

    // --- book the user's event
    await bookOptinEvent(page);

    // --- login as that user
    await user.apiLogin();

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

    await page.goto("/bookings/unconfirmed");
    await page.click('[data-testid="reject"]');
    await page.click('[data-testid="rejection-confirm"]');
    await page.waitForResponse((response) => response.url().includes("/api/trpc/bookings/confirm"));

    // --- check that webhook was called
    await waitFor(() => {
      expect(webhookReceiver.requestList.length).toBe(1);
    });
    const [request] = webhookReceiver.requestList;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = request.body as any;

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
    // body.payload.metadata.videoCallUrl = dynamic;

    expect(body).toMatchObject({
      triggerEvent: "BOOKING_REJECTED",
      createdAt: "[redacted/dynamic]",
      payload: {
        type: "Opt in",
        title: "Opt in between Nameless and Test Testson",
        customInputs: {},
        startTime: "[redacted/dynamic]",
        endTime: "[redacted/dynamic]",
        organizer: {
          id: "[redacted/dynamic]",
          name: "Unnamed",
          email: "[redacted/dynamic]",
          timeZone: "[redacted/dynamic]",
          language: "[redacted/dynamic]",
        },
        responses: {
          email: {
            value: "test@example.com",
            label: "email",
          },
          name: {
            value: "Test Testson",
            label: "name",
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
        destinationCalendar: [],
        // hideCalendarNotes: false,
        requiresConfirmation: "[redacted/dynamic]",
        eventTypeId: "[redacted/dynamic]",
        uid: "[redacted/dynamic]",
        eventTitle: "Opt in",
        eventDescription: null,
        price: 0,
        currency: "usd",
        length: 30,
        bookingId: "[redacted/dynamic]",
        // metadata: { videoCallUrl: "[redacted/dynamic]" },
        status: "REJECTED",
        additionalInformation: "[redacted/dynamic]",
      },
    });

    webhookReceiver.close();
  });
});

test.describe("BOOKING_REQUESTED", async () => {
  test("can book an event that requires confirmation and get a booking requested event", async ({
    page,
    users,
  }) => {
    const webhookReceiver = createHttpServer();
    // --- create a user
    const user = await users.create();

    // --- login as that user
    await user.apiLogin();

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

    // --- visit user page
    await page.goto(`/${user.username}`);

    // --- book the user's opt in
    await bookOptinEvent(page);

    // --- check that webhook was called

    await waitFor(() => {
      expect(webhookReceiver.requestList.length).toBe(1);
    });
    const [request] = webhookReceiver.requestList;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = request.body as any;

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
      triggerEvent: "BOOKING_REQUESTED",
      createdAt: "[redacted/dynamic]",
      payload: {
        type: "Opt in",
        title: "Opt in between Nameless and Test Testson",
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
        requiresConfirmation: "[redacted/dynamic]",
        eventTypeId: "[redacted/dynamic]",
        uid: "[redacted/dynamic]",
        eventTitle: "Opt in",
        eventDescription: null,
        price: 0,
        currency: "usd",
        length: 30,
        bookingId: "[redacted/dynamic]",
        status: "PENDING",
        additionalInformation: "[redacted/dynamic]",
        metadata: { videoCallUrl: "[redacted/dynamic]" },
      },
    });

    webhookReceiver.close();
  });
});

test.describe("FORM_SUBMITTED", async () => {
  test("on submitting user form, triggers user webhook", async ({ page, users, routingForms }) => {
    const webhookReceiver = createHttpServer();
    const user = await users.create(null, {
      hasTeam: true,
    });

    await user.apiLogin();

    await page.goto(`/settings/developer/webhooks/new`);

    // Add webhook
    await page.fill('[name="subscriberUrl"]', webhookReceiver.url);
    await page.fill('[name="secret"]', "secret");
    await page.click("[type=submit]");

    // Page contains the url
    expect(page.locator(`text='${webhookReceiver.url}'`)).toBeDefined();

    await page.waitForLoadState("networkidle");

    const form = await routingForms.create({
      name: "Test Form",
      userId: user.id,
      teamId: null,
      fields: [
        {
          type: "text",
          label: "Name",
          identifier: "name",
          required: true,
        },
      ],
    });

    await gotoRoutingLink({ page, formId: form.id });
    const fieldName = "name";
    await page.fill(`[data-testid="form-field-${fieldName}"]`, "John Doe");
    page.click('button[type="submit"]');

    await waitFor(() => {
      expect(webhookReceiver.requestList.length).toBe(1);
    });
    const [request] = webhookReceiver.requestList;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = request.body as any;
    body.createdAt = dynamic;
    expect(body).toEqual({
      triggerEvent: "FORM_SUBMITTED",
      createdAt: dynamic,
      payload: {
        formId: form.id,
        formName: form.name,
        teamId: null,
        responses: {
          name: {
            value: "John Doe",
          },
        },
      },
      name: "John Doe",
    });

    webhookReceiver.close();
  });

  test("on submitting team form, triggers team webhook", async ({ page, users, routingForms }) => {
    const webhookReceiver = createHttpServer();
    const user = await users.create(null, {
      hasTeam: true,
    });
    await user.apiLogin();

    await page.goto(`/settings/developer/webhooks`);
    const teamId = await clickFirstTeamWebhookCta(page);

    // Add webhook
    await page.fill('[name="subscriberUrl"]', webhookReceiver.url);
    await page.fill('[name="secret"]', "secret");
    await page.click("[type=submit]");

    const form = await routingForms.create({
      name: "Test Form",
      userId: user.id,
      teamId: teamId,
      fields: [
        {
          type: "text",
          label: "Name",
          identifier: "name",
          required: true,
        },
      ],
    });

    await gotoRoutingLink({ page, formId: form.id });
    const fieldName = "name";
    await page.fill(`[data-testid="form-field-${fieldName}"]`, "John Doe");
    page.click('button[type="submit"]');
    await waitFor(() => {
      expect(webhookReceiver.requestList.length).toBe(1);
    });
    const [request] = webhookReceiver.requestList;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = request.body as any;
    body.createdAt = dynamic;
    expect(body).toEqual({
      triggerEvent: "FORM_SUBMITTED",
      createdAt: dynamic,
      payload: {
        formId: form.id,
        formName: form.name,
        teamId,
        responses: {
          name: {
            value: "John Doe",
          },
        },
      },
      name: "John Doe",
    });

    webhookReceiver.close();
  });
});

async function clickFirstTeamWebhookCta(page: Page) {
  await page.click('[data-testid="new_webhook"]');
  await page.click('[data-testid="option-team-1"]');
  await page.waitForURL((u) => u.pathname === "/settings/developer/webhooks/new");
  const url = page.url();
  const teamId = Number(new URL(url).searchParams.get("teamId")) as number;
  return teamId;
}
