import { expect } from "@playwright/test";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { loginUser } from "./fixtures/regularBookings";
import { test } from "./lib/fixtures";
import { bookOptinEvent, createHttpServer, bookEventOnThisPage } from "./lib/testUtils";

// Remove dynamic properties that differs depending on where you run the tests
const dynamic = "[redacted/dynamic]";

const bodyProps = {
  createdAt: "[redacted/dynamic]",
  payload: {
    title: "30 min between testuser and Test Testson",
    type: "30 min",
    customInputs: {},
    userFieldsResponses: {},
    responses: {
      name: { label: "your_name", value: "Test Testson" },
      email: { label: "[redacted/dynamic]", value: "[redacted/dynamic]" },
      guests: { label: "additional_guests", value: [] },
    },
    startTime: "[redacted/dynamic]",
    endTime: "[redacted/dynamic]",
    organizer: {
      email: "[redacted/dynamic]",
      name: "testuser",
      timeZone: "[redacted/dynamic]",
      timeFormat: "[redacted/dynamic]",
      language: { locale: "[redacted/dynamic]" },
      id: "[redacted/dynamic]",
      username: "[redacted/dynamic]",
    },
    attendees: [
      {
        email: "[redacted/dynamic]",
        firstName: "",
        language: { locale: "[redacted/dynamic]" },
        lastName: "",
        name: "testuser",
        timeZone: "[redacted/dynamic]",
      },
    ],
    uid: "[redacted/dynamic]",
    bookingId: "[redacted/dynamic]",
    location: "",
    destinationCalendar: null,
    seatsPerTimeSlot: null,
    seatsShowAttendees: true,
    eventTitle: "30 min",
    eventDescription: null,
    requiresConfirmation: false,
    price: 0,
    currency: "usd",
    length: 30,
    status: "ACCEPTED",
    eventTypeId: "[redacted/dynamic]",
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const updateBody = (body: any) => {
  body.createdAt = dynamic;
  body.payload.bookingId = dynamic;
  body.payload.eventTypeId = dynamic;
  body.payload.startTime = dynamic;
  body.payload.endTime = dynamic;
  body.payload.organizer.id = dynamic;
  body.payload.organizer.email = dynamic;
  body.payload.organizer.username = dynamic;
  body.payload.organizer.timeZone = dynamic;
  body.payload.organizer.timeFormat = dynamic;
  body.payload.organizer.language.locale = dynamic;
  body.payload.responses.email.label = dynamic;
  body.payload.responses.email.value = dynamic;
  body.payload.uid = dynamic;
  body.payload.attendees = [
    {
      email: dynamic,
      firstName: "",
      language: {
        locale: dynamic,
      },
      lastName: "",
      name: "testuser",
      timeZone: dynamic,
    },
  ];
  return body;
};

test.describe("Add webhook on event type config", async () => {
  test.beforeEach(async ({ users }) => {
    users.deleteAll();
    await loginUser(users);
  });
  test("Create booking", async ({ bookingPage }) => {
    const webhookReceiver = createHttpServer();
    await bookingPage.createBookingWebhook(webhookReceiver, "30 min");
    const eventTypePage = await bookingPage.previewEventType();
    await bookEventOnThisPage(eventTypePage);
    await webhookReceiver.waitForRequestCount(2);

    const [_, bookingCreatedRequest] = webhookReceiver.requestList;
    const body = updateBody(bookingCreatedRequest.body);

    expect(body).toMatchObject({ ...bodyProps, triggerEvent: "BOOKING_CREATED" });
    webhookReceiver.close();
  });

  test("Booking rescheduled", async ({ bookingPage }) => {
    const webhookReceiver = createHttpServer();
    await bookingPage.createBookingWebhook(webhookReceiver, "30 min");
    const eventTypePage = await bookingPage.previewEventType();
    await bookEventOnThisPage(eventTypePage);
    await bookingPage.rescheduleBooking(eventTypePage);

    await webhookReceiver.waitForRequestCount(3);

    const [_, bookingCreatedRequest, bookingRescheduledRequest] = webhookReceiver.requestList;

    const body = updateBody(bookingRescheduledRequest.body);

    expect(body).toMatchObject({ ...bodyProps, triggerEvent: "BOOKING_RESCHEDULED" });
    webhookReceiver.close();
  });

  test("Booking canceled", async ({ bookingPage }) => {
    const webhookReceiver = createHttpServer();
    await bookingPage.createBookingWebhook(webhookReceiver, "30 min");
    const eventTypePage = await bookingPage.previewEventType();
    await bookEventOnThisPage(eventTypePage);
    await bookingPage.cancelBooking(eventTypePage);

    await webhookReceiver.waitForRequestCount(3);

    const [_, _bookingCreatedRequest, bookingCanceledRequest] = webhookReceiver.requestList;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = updateBody(bookingCanceledRequest.body);

    expect(body).toMatchObject({
      ...bodyProps,
      triggerEvent: "BOOKING_CANCELLED",
      payload: {
        ...bodyProps.payload,
        team: { name: "", members: [] },
        cancellationReason: "Test cancel",
        destinationCalendar: [],
        seatsShowAttendees: false,
        status: "CANCELLED",
        price: null,
        requiresConfirmation: null,
        responses: {
          ...bodyProps.payload.responses,
          name: { label: "name", value: "Test Testson" },
          guests: { label: "guests", value: [] },
        },
      },
    });
    webhookReceiver.close();
  });

  test("Booking rejected", async ({ page, users, bookingPage }) => {
    const webhookReceiver = createHttpServer();
    await bookingPage.createBookingWebhook(webhookReceiver, "Opt in");
    await page.goto(`/${users.get()[0].username}`);
    await bookOptinEvent(page);

    await bookingPage.rejectFirstBooking();
    await webhookReceiver.waitForRequestCount(3);
    const [_, _bookingCreatedRequest, bookingRejectedRequest] = webhookReceiver.requestList;

    const body = updateBody(bookingRejectedRequest.body);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bodyPropsCopy: any = { ...bodyProps };

    delete bodyPropsCopy.payload.seatsPerTimeSlot;
    delete bodyPropsCopy.payload.seatsShowAttendees;

    expect(body).toMatchObject({
      ...bodyPropsCopy,
      triggerEvent: "BOOKING_REJECTED",
      payload: {
        ...bodyPropsCopy.payload,
        status: "REJECTED",
        requiresConfirmation: true,
        title: "Opt in between testuser and Test Testson",
        type: "Opt in",
        eventTitle: "Opt in",
        destinationCalendar: [],
        responses: {
          ...bodyProps.payload.responses,
          name: { label: "name", value: "Test Testson" },
          guests: { label: "guests", value: [] },
        },
      },
    });
    webhookReceiver.close();
  });

  test("Booking requested", async ({ page, users, bookingPage }) => {
    const webhookReceiver = createHttpServer();
    await bookingPage.createBookingWebhook(webhookReceiver, "Opt in");
    await page.goto(`/${users.get()[0].username}`);
    await bookOptinEvent(page);
    await webhookReceiver.waitForRequestCount(2);
    const [_, bookingRequestedRequest] = webhookReceiver.requestList;

    const body = updateBody(bookingRequestedRequest.body);

    expect(body).toMatchObject({
      ...bodyProps,
      triggerEvent: "BOOKING_REQUESTED",
      payload: {
        ...bodyProps.payload,
        title: "Opt in between testuser and Test Testson",
        bookerUrl: WEBAPP_URL,
        hideCalendarNotes: false,
        status: "PENDING",
        requiresConfirmation: true,
        type: "Opt in",
        eventTitle: "Opt in",
      },
    });
    webhookReceiver.close();
  });
});
