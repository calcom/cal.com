import { expect } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/client";

import { test } from "./lib/fixtures";
import {
  bookOptinEvent,
  bookTimeSlot,
  confirmReschedule,
  createUserWithSeatedEventAndAttendees,
  gotoRoutingLink,
  selectFirstAvailableTimeSlotNextMonth,
  submitAndWaitForResponse,
} from "./lib/testUtils";

// remove dynamic properties that differs depending on where you run the tests
const dynamic = "[redacted/dynamic]";

test.afterEach(async ({ users }) => {
  // This also delete forms on cascade
  await users.deleteAll();
});

test.describe("BOOKING_CREATED", async () => {
  test("add webhook & test that creating an event triggers a webhook call", async ({
    page,
    users,
    webhooks,
  }, _testInfo) => {
    const user = await users.create();
    const [eventType] = user.eventTypes;
    await user.apiLogin();
    const webhookReceiver = await webhooks.createReceiver();

    // --- Book the first available day next month in the pro user's "30min"-event
    await page.goto(`/${user.username}/${eventType.slug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);

    await webhookReceiver.waitForRequestCount(1);

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
        type: "30-min",
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
        hideCalendarEventDetails: false,
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
    webhooks,
  }) => {
    // --- create a user
    const user = await users.create();

    // --- visit user page
    await page.goto(`/${user.username}`);

    // --- book the user's event
    await bookOptinEvent(page);

    // --- login as that user
    await user.apiLogin();
    const webhookReceiver = await webhooks.createReceiver();
    await page.goto("/bookings/unconfirmed");
    await page.click('[data-testid="reject"]');

    await submitAndWaitForResponse(page, "/api/trpc/bookings/confirm?batch=1", {
      action: () => page.click('[data-testid="rejection-confirm"]'),
    });

    await webhookReceiver.waitForRequestCount(1);

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
        type: "opt-in",
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
    webhooks,
  }) => {
    // --- create a user
    const user = await users.create();

    // --- login as that user
    await user.apiLogin();
    const webhookReceiver = await webhooks.createReceiver();

    // --- visit user page
    await page.goto(`/${user.username}`);

    // --- book the user's opt in
    await bookOptinEvent(page);

    // --- check that webhook was called

    await webhookReceiver.waitForRequestCount(1);

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
        type: "opt-in",
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

test.describe("BOOKING_RESCHEDULED", async () => {
  test("can reschedule a booking and get a booking rescheduled event", async ({
    page,
    users,
    bookings,
    webhooks,
  }) => {
    const user = await users.create();
    const [eventType] = user.eventTypes;

    await user.apiLogin();

    const webhookReceiver = await webhooks.createReceiver();

    const booking = await bookings.create(user.id, user.username, eventType.id, {
      status: BookingStatus.ACCEPTED,
    });

    await page.goto(`/${user.username}/${eventType.slug}?rescheduleUid=${booking.uid}`);

    await selectFirstAvailableTimeSlotNextMonth(page);

    await confirmReschedule(page);

    await expect(page.getByTestId("success-page")).toBeVisible();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const newBooking = await prisma.booking.findFirst({ where: { fromReschedule: booking?.uid } })!;
    expect(newBooking).not.toBeNull();

    // --- check that webhook was called
    await webhookReceiver.waitForRequestCount(1);

    const [request] = webhookReceiver.requestList;

    expect(request.body).toMatchObject({
      triggerEvent: "BOOKING_RESCHEDULED",
      payload: {
        uid: newBooking?.uid,
      },
    });
  });

  test("when rescheduling to a booking that already exists, should send a booking rescheduled event with the existant booking uid", async ({
    page,
    users,
    bookings,
    webhooks,
  }) => {
    const { user, eventType, booking } = await createUserWithSeatedEventAndAttendees({ users, bookings }, [
      { name: "John First", email: "first+seats@cal.com", timeZone: "Europe/Berlin" },
      { name: "Jane Second", email: "second+seats@cal.com", timeZone: "Europe/Berlin" },
    ]);

    await prisma.eventType.update({
      where: { id: eventType.id },
      data: { requiresConfirmation: false },
    });

    await user.apiLogin();

    const webhookReceiver = await webhooks.createReceiver();

    const bookingAttendees = await prisma.attendee.findMany({
      where: { bookingId: booking.id },
      select: {
        id: true,
        email: true,
      },
    });

    const bookingSeats = bookingAttendees.map((attendee) => ({
      bookingId: booking.id,
      attendeeId: attendee.id,
      referenceUid: uuidv4(),
    }));

    await prisma.bookingSeat.createMany({
      data: bookingSeats,
    });

    const references = await prisma.bookingSeat.findMany({
      where: { bookingId: booking.id },
      include: { attendee: true },
    });

    await page.goto(`/reschedule/${references[0].referenceUid}`);

    await selectFirstAvailableTimeSlotNextMonth(page);

    await confirmReschedule(page);

    await expect(page.getByTestId("success-page")).toBeVisible();

    const newBooking = await prisma.booking.findFirst({
      where: {
        attendees: {
          some: {
            email: bookingAttendees[0].email,
          },
        },
      },
    });

    // --- ensuring that new booking was created
    expect(newBooking).not.toBeNull();

    // --- check that webhook was called
    await webhookReceiver.waitForRequestCount(1);

    const [firstRequest] = webhookReceiver.requestList;

    expect(firstRequest?.body).toMatchObject({
      triggerEvent: "BOOKING_RESCHEDULED",
      payload: {
        uid: newBooking?.uid,
      },
    });

    await page.goto(`/reschedule/${references[1].referenceUid}`);

    await selectFirstAvailableTimeSlotNextMonth(page);

    await confirmReschedule(page);

    await expect(page).toHaveURL(/.*booking/);

    await webhookReceiver.waitForRequestCount(2);

    const [_, secondRequest] = webhookReceiver.requestList;

    expect(secondRequest?.body).toMatchObject({
      triggerEvent: "BOOKING_RESCHEDULED",
      payload: {
        // in the current implementation, it is the same as the first booking
        uid: newBooking?.uid,
      },
    });
  });
});

test.describe("MEETING_ENDED, MEETING_STARTED", async () => {
  test("should create/remove scheduledWebhookTriggers for existing bookings", async ({
    page,
    users,
    bookings,
  }, _testInfo) => {
    const user = await users.create();
    await user.apiLogin();
    const [eventType] = user.eventTypes;
    bookings.create(user.id, user.name, eventType.id);
    bookings.create(user.id, user.name, eventType.id, { startTime: dayjs().add(2, "day").toDate() });

    //create a new webhook with meeting ended trigger here
    await page.goto("/settings/developer/webhooks");
    // --- add webhook
    await page.click('[data-testid="new_webhook"]');

    await page.fill('[name="subscriberUrl"]', "https://www.example.com");

    await Promise.all([
      page.click("[type=submit]"),
      page.waitForURL((url) => url.pathname.endsWith("/settings/developer/webhooks")),
    ]);

    const scheduledTriggers = await prisma.webhookScheduledTriggers.findMany({
      where: {
        webhook: {
          userId: user.id,
        },
      },
      select: {
        payload: true,
        webhook: {
          select: {
            userId: true,
            id: true,
            subscriberUrl: true,
          },
        },
        startAfter: true,
      },
    });

    const existingUserBookings = await prisma.booking.findMany({
      where: {
        userId: user.id,
        startTime: {
          gt: new Date(),
        },
      },
    });

    const meetingStartedTriggers = scheduledTriggers.filter((trigger) =>
      trigger.payload.includes("MEETING_STARTED")
    );
    const meetingEndedTriggers = scheduledTriggers.filter((trigger) =>
      trigger.payload.includes("MEETING_ENDED")
    );

    expect(meetingStartedTriggers.length).toBe(existingUserBookings.length);
    expect(meetingEndedTriggers.length).toBe(existingUserBookings.length);

    expect(meetingStartedTriggers.map((trigger) => trigger.startAfter)).toEqual(
      expect.arrayContaining(existingUserBookings.map((booking) => booking.startTime))
    );
    expect(meetingEndedTriggers.map((trigger) => trigger.startAfter)).toEqual(
      expect.arrayContaining(existingUserBookings.map((booking) => booking.endTime))
    );

    page.reload();

    // edit webhook and remove trigger meeting ended trigger
    await page.click('[data-testid="webhook-edit-button"]');
    await page.getByRole("button", { name: "Remove Meeting Ended" }).click();

    await Promise.all([
      page.click("[type=submit]"),
      page.waitForURL((url) => url.pathname.endsWith("/settings/developer/webhooks")),
    ]);

    const scheduledTriggersAfterRemovingTrigger = await prisma.webhookScheduledTriggers.findMany({
      where: {
        webhook: {
          userId: user.id,
        },
      },
    });

    const newMeetingStartedTriggers = scheduledTriggersAfterRemovingTrigger.filter((trigger) =>
      trigger.payload.includes("MEETING_STARTED")
    );
    const newMeetingEndedTriggers = scheduledTriggersAfterRemovingTrigger.filter((trigger) =>
      trigger.payload.includes("MEETING_ENDED")
    );

    expect(newMeetingStartedTriggers.length).toBe(existingUserBookings.length);
    expect(newMeetingEndedTriggers.length).toBe(0);

    // disable webhook
    await submitAndWaitForResponse(page, "/api/trpc/webhook/edit?batch=1", {
      action: () => page.getByTestId("webhook-switch").click(),
    });

    const scheduledTriggersAfterDisabling = await prisma.webhookScheduledTriggers.findMany({
      where: {
        webhook: {
          userId: user.id,
        },
      },
      select: {
        payload: true,
        webhook: {
          select: {
            userId: true,
          },
        },
        startAfter: true,
      },
    });

    expect(scheduledTriggersAfterDisabling.length).toBe(0);
  });
});

test.describe("FORM_SUBMITTED", async () => {
  test("on submitting user form, triggers user webhook", async ({ page, users, routingForms, webhooks }) => {
    const user = await users.create();

    await user.apiLogin();
    const webhookReceiver = await webhooks.createReceiver();

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

    await webhookReceiver.waitForRequestCount(1);

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
            response: "John Doe",
          },
        },
      },
      name: "John Doe",
    });

    webhookReceiver.close();
  });

  test("on submitting team form, triggers team webhook", async ({ page, users, routingForms, webhooks }) => {
    const user = await users.create(null, {
      hasTeam: true,
    });
    await user.apiLogin();
    const { webhookReceiver, teamId } = await webhooks.createTeamReceiver();
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
        {
          type: "multiselect",
          label: "Multi Select",
          identifier: "multi",
          required: true,
          options: [
            {
              label: "Option-1",
              id: "1",
            },
            {
              label: "Option-2",
              id: "2",
            },
          ],
        },
      ],
    });

    await gotoRoutingLink({ page, formId: form.id });
    const textFieldIdentifier = "name";
    const multiSelectFieldIdentifier = "multi";
    await page.fill(`[data-testid="form-field-${textFieldIdentifier}"]`, "John Doe");
    await page.click(`[data-testid="form-field-${multiSelectFieldIdentifier}"]`); // Open dropdown
    await page.click("text=Option-2"); // Select option
    page.click('button[type="submit"]');

    await webhookReceiver.waitForRequestCount(1);

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
            response: "John Doe",
          },
          multi: {
            value: ["Option-2"],
            response: [
              {
                id: "2",
                label: "Option-2",
              },
            ],
          },
        },
      },
      /* Legacy fields Start */
      name: "John Doe",
      multi: ["Option-2"],
      /* Legacy fields End */
    });

    webhookReceiver.close();
  });
});

test.describe("OOO_CREATED", async () => {
  test("on creating an OOO, triggers OOO webhook", async ({ page, users, webhooks }) => {
    const user = await users.create();
    await user.apiLogin();
    const webhookReceiver = await webhooks.createReceiver();

    await page.goto("/settings/my-account/out-of-office");

    await page.getByTestId("add_entry_ooo").click();
    await page.getByTestId("reason_select").click();

    await page.getByTestId("select-option-4").click();

    await page.getByTestId("notes_input").click();
    await page.getByTestId("notes_input").fill("Demo notes");
    await page.getByTestId("create-or-edit-entry-ooo-redirect").click();

    await expect(page.locator(`data-testid=table-redirect-n-a`)).toBeVisible();

    await webhookReceiver.waitForRequestCount(1);

    const [request] = webhookReceiver.requestList;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = request.body as any;
    body.createdAt = dynamic;
    body.payload.oooEntry.createdAt = dynamic;
    body.payload.oooEntry.updatedAt = dynamic;
    body.payload.oooEntry.end = dynamic;
    body.payload.oooEntry.id = dynamic;
    body.payload.oooEntry.start = dynamic;
    body.payload.oooEntry.updatedAt = dynamic;
    body.payload.oooEntry.user.id = dynamic;
    body.payload.oooEntry.user.email = dynamic;
    body.payload.oooEntry.user.username = dynamic;
    body.payload.oooEntry.uuid = dynamic;
    expect(body).toEqual({
      createdAt: "[redacted/dynamic]",
      payload: {
        oooEntry: {
          createdAt: "[redacted/dynamic]",
          end: "[redacted/dynamic]",
          id: "[redacted/dynamic]",
          notes: "Demo notes",
          reason: {
            emoji: "🤒",
            reason: "ooo_reasons_sick_leave",
          },
          reasonId: 4,
          start: "[redacted/dynamic]",
          toUser: null,
          updatedAt: "[redacted/dynamic]",
          user: {
            id: "[redacted/dynamic]",
            email: "[redacted/dynamic]",
            name: null,
            timeZone: "Europe/London",
            username: "[redacted/dynamic]",
          },
          uuid: "[redacted/dynamic]",
        },
      },
      triggerEvent: "OOO_CREATED",
    });

    webhookReceiver.close();
  });

  test("on creating an OOO inside a team, triggers OOO webhook", async ({ page, users, webhooks }) => {
    const user = await users.create(null, {
      hasTeam: true,
    });
    await user.apiLogin();
    const { webhookReceiver } = await webhooks.createTeamReceiver();

    await page.goto("/settings/my-account/out-of-office");

    await page.getByTestId("add_entry_ooo").click();
    await page.getByTestId("reason_select").click();

    await page.getByTestId("select-option-4").click();

    await page.getByTestId("notes_input").click();
    await page.getByTestId("notes_input").fill("Demo notes");
    await page.getByTestId("create-or-edit-entry-ooo-redirect").click();

    await expect(page.locator(`data-testid=table-redirect-n-a`)).toBeVisible();

    await webhookReceiver.waitForRequestCount(1);

    const [request] = webhookReceiver.requestList;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = request.body as any;
    body.createdAt = dynamic;
    body.payload.oooEntry.createdAt = dynamic;
    body.payload.oooEntry.updatedAt = dynamic;
    body.payload.oooEntry.end = dynamic;
    body.payload.oooEntry.id = dynamic;
    body.payload.oooEntry.start = dynamic;
    body.payload.oooEntry.updatedAt = dynamic;
    body.payload.oooEntry.user.id = dynamic;
    body.payload.oooEntry.user.email = dynamic;
    body.payload.oooEntry.user.username = dynamic;
    body.payload.oooEntry.uuid = dynamic;
    expect(body).toEqual({
      triggerEvent: "OOO_CREATED",
      createdAt: "[redacted/dynamic]",
      payload: {
        oooEntry: {
          createdAt: "[redacted/dynamic]",
          end: "[redacted/dynamic]",
          id: "[redacted/dynamic]",
          notes: "Demo notes",
          reason: {
            emoji: "🤒",
            reason: "ooo_reasons_sick_leave",
          },
          reasonId: 4,
          start: "[redacted/dynamic]",
          toUser: null,
          updatedAt: "[redacted/dynamic]",
          user: {
            id: "[redacted/dynamic]",
            email: "[redacted/dynamic]",
            name: null,
            timeZone: "Europe/London",
            username: "[redacted/dynamic]",
          },
          uuid: "[redacted/dynamic]",
        },
      },
    });

    webhookReceiver.close();
  });
});
