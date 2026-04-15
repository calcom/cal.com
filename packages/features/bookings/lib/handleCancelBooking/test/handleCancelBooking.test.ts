import {
  BookingLocations,
  createBookingScenario,
  getBooker,
  getDate,
  getGoogleCalendarCredential,
  getOrganizer,
  getScenarioData,
  mockCalendarToHaveNoBusySlots,
  mockSuccessfulVideoMeetingCreation,
  TestData,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { processPaymentRefund } from "@calcom/features/bookings/lib/payment/processPaymentRefund";
import { BookingStatus } from "@calcom/prisma/enums";
import {
  expectBookingCancelledWebhookToHaveBeenFired,
  expectWorkflowToBeTriggered,
} from "@calcom/testing/lib/bookingScenario/expects";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import { test } from "@calcom/testing/lib/fixtures/fixtures";
import { describe, expect, vi } from "vitest";

vi.mock("@calcom/features/bookings/lib/payment/processPaymentRefund", () => ({
  processPaymentRefund: vi.fn(),
}));

describe("Cancel Booking", () => {
  setupAndTeardown();

  test("Should trigger BOOKING_CANCELLED webhook and workflow", async ({ emails }) => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "h5Wv3eHgconAED2j4gcVhP";
    const idOfBookingToBeCancelled = 1020;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        webhooks: [
          {
            userId: organizer.id,
            eventTriggers: ["BOOKING_CANCELLED"],
            subscriberUrl: "http://my-webhook.example.com",
            active: true,
            eventTypeId: 1,
            appId: null,
          },
        ],
        workflows: [
          {
            userId: organizer.id,
            trigger: "EVENT_CANCELLED",
            action: "EMAIL_HOST",
            template: "REMINDER",
            activeOn: [1],
          },
        ],
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            attendees: [
              {
                email: booker.email,
                timeZone: "Asia/Kolkata",
              },
            ],
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:15:00.000Z`,
            metadata: {
              videoCallUrl: "https://existing-daily-video-call-url.example.com",
            },
          },
        ],
        organizer,
        apps: [TestData.apps["daily-video"]],
      })
    );
    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
      videoMeetingData: {
        id: "MOCK_ID",
        password: "MOCK_PASS",
        url: `http://mock-dailyvideo.example.com/meeting-1`,
      },
    });

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
      },
    });

    await handleCancelBooking({
      bookingData: {
        id: idOfBookingToBeCancelled,
        uid: uidOfBookingToBeCancelled,
        cancelledBy: organizer.email,
        cancellationReason: "No reason",
      },
      impersonatedByUserUuid: null,
      actionSource: "WEBAPP",
    });

    expectBookingCancelledWebhookToHaveBeenFired({
      booker,
      organizer,
      location: BookingLocations.CalVideo,
      subscriberUrl: "http://my-webhook.example.com",
      payload: {
        cancelledBy: organizer.email,
        organizer: {
          id: organizer.id,
          username: organizer.username,
          email: organizer.email,
          name: organizer.name,
          timeZone: organizer.timeZone,
        },
      },
    });

    expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });
  });

  test("Should call processPaymentRefund", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "h5Wv3eHgconAED2j4gcVhP";
    const idOfBookingToBeCancelled = 1020;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
    const booking = {
      id: idOfBookingToBeCancelled,
      uid: uidOfBookingToBeCancelled,
      eventTypeId: 1,
      userId: 101,
      responses: {
        email: booker.email,
        name: booker.name,
        location: { optionValue: "", value: BookingLocations.CalVideo },
      },
      status: BookingStatus.ACCEPTED,
      startTime: `${plus1DateString}T05:00:00.000Z`,
      endTime: `${plus1DateString}T05:15:00.000Z`,
      metadata: {
        videoCallUrl: "https://existing-daily-video-call-url.example.com",
      },
      attendees: [
        {
          timeZone: "Asia/Kolkata",
          email: booker.email,
        },
      ],
    };

    await createBookingScenario(
      getScenarioData({
        webhooks: [
          {
            userId: organizer.id,
            eventTriggers: ["BOOKING_CANCELLED"],
            subscriberUrl: "http://my-webhook.example.com",
            active: true,
            eventTypeId: 1,
            appId: null,
          },
        ],
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        payment: [
          {
            amount: 12,
            bookingId: idOfBookingToBeCancelled,
            currency: "usd",
            data: {},
            externalId: "ext_id",
            fee: 12,
            refunded: false,
            success: true,
            uid: uidOfBookingToBeCancelled,
          },
        ],
        bookings: [booking],
        organizer,
        apps: [TestData.apps["daily-video"]],
      })
    );
    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
      videoMeetingData: {
        id: "MOCK_ID",
        password: "MOCK_PASS",
        url: `http://mock-dailyvideo.example.com/meeting-1`,
      },
    });

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
      },
    });

    await handleCancelBooking({
      bookingData: {
        id: idOfBookingToBeCancelled,
        uid: uidOfBookingToBeCancelled,
        cancelledBy: organizer.email,
        cancellationReason: "No reason",
      },
      impersonatedByUserUuid: null,
      actionSource: "WEBAPP",
    });

    expectBookingCancelledWebhookToHaveBeenFired({
      booker,
      organizer,
      location: BookingLocations.CalVideo,
      subscriberUrl: "http://my-webhook.example.com",
      payload: {
        cancelledBy: organizer.email,
        organizer: {
          id: organizer.id,
          username: organizer.username,
          email: organizer.email,
          name: organizer.name,
          timeZone: organizer.timeZone,
        },
      },
    });

    expect(processPaymentRefund).toHaveBeenCalled();
  });

  test("Should successfully cancel round robin team event when host is also an attendee with workflow emails", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const organizer = getOrganizer({
      name: "Host Organizer",
      email: "host-organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const hostAttendee = getOrganizer({
      name: "Host Attendee",
      email: "host-attendee@example.com",
      id: 102,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "round-robin-booking-uid";
    const idOfBookingToBeCancelled = 2030;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        webhooks: [
          {
            userId: organizer.id,
            eventTriggers: ["BOOKING_CANCELLED"],
            subscriberUrl: "http://my-webhook.example.com",
            active: true,
            eventTypeId: 2,
            appId: null,
          },
        ],
        eventTypes: [
          {
            id: 2,
            slotInterval: 30,
            length: 30,
            schedulingType: "ROUND_ROBIN",
            teamId: 1,
            users: [
              {
                id: 101,
              },
              {
                id: 102,
              },
            ],
            hosts: [
              {
                userId: 101,
                isFixed: false,
              },
              {
                userId: 102,
                isFixed: false,
              },
            ],
          },
        ],
        workflows: [
          {
            id: 1,
            name: "Cancellation Email Workflow",
            teamId: 1,
            trigger: "EVENT_CANCELLED",
            action: "EMAIL_ATTENDEE",
            template: "REMINDER",
            activeOn: [2],
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            eventTypeId: 2,
            userId: 101,
            responses: {
              email: hostAttendee.email,
              name: hostAttendee.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:30:00.000Z`,
            attendees: [
              {
                email: hostAttendee.email,
                timeZone: "Asia/Kolkata",
                locale: "en",
              },
            ],
          },
        ],
        users: [organizer, hostAttendee],
        apps: [TestData.apps["daily-video"]],
      })
    );

    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
      videoMeetingData: {
        id: "MOCK_ID",
        password: "MOCK_PASS",
        url: `http://mock-dailyvideo.example.com/meeting-2`,
      },
    });

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_2",
      },
    });

    const result = await handleCancelBooking({
      bookingData: {
        id: idOfBookingToBeCancelled,
        uid: uidOfBookingToBeCancelled,
        cancelledBy: organizer.email,
        cancellationReason: "Testing round robin cancellation with host as attendee",
      },
      impersonatedByUserUuid: null,
      actionSource: "WEBAPP",
    });

    expect(result.success).toBe(true);
    expect(result.bookingId).toBe(idOfBookingToBeCancelled);
    expect(result.bookingUid).toBe(uidOfBookingToBeCancelled);
    expect(result.onlyRemovedAttendee).toBe(false);

    expectBookingCancelledWebhookToHaveBeenFired({
      booker: hostAttendee,
      organizer,
      location: BookingLocations.CalVideo,
      subscriberUrl: "http://my-webhook.example.com",
      payload: {
        cancelledBy: organizer.email,
        organizer: {
          id: organizer.id,
          username: organizer.username,
          email: organizer.email,
          name: organizer.name,
          timeZone: organizer.timeZone,
        },
      },
    });
  });

  test("Should send EMAIL_HOST cancel workflow notification to both primary and secondary hosts in round robin events", async ({
    emails,
  }) => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const primaryHost = getOrganizer({
      name: "Primary Host",
      email: "primary-host@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const secondaryHost = getOrganizer({
      name: "Secondary Host",
      email: "secondary-host@example.com",
      id: 102,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "round-robin-email-host-workflow-uid";
    const idOfBookingToBeCancelled = 2040;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 2,
            slotInterval: 30,
            length: 30,
            schedulingType: "ROUND_ROBIN",
            teamId: 1,
            users: [
              {
                id: 101,
              },
              {
                id: 102,
              },
            ],
            hosts: [
              {
                userId: 101,
                isFixed: false,
              },
              {
                userId: 102,
                isFixed: false,
              },
            ],
          },
        ],
        workflows: [
          {
            id: 1,
            name: "Cancel Email Host Workflow",
            teamId: 1,
            trigger: "EVENT_CANCELLED",
            action: "EMAIL_HOST",
            template: "REMINDER",
            activeOn: [2],
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            eventTypeId: 2,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:30:00.000Z`,
            attendees: [
              {
                email: booker.email,
                timeZone: "Asia/Kolkata",
                locale: "en",
              },
              {
                email: secondaryHost.email,
                timeZone: "Asia/Kolkata",
                locale: "en",
              },
            ],
          },
        ],
        users: [primaryHost, secondaryHost],
        apps: [TestData.apps["daily-video"]],
      })
    );

    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
      videoMeetingData: {
        id: "MOCK_ID",
        password: "MOCK_PASS",
        url: `http://mock-dailyvideo.example.com/meeting-3`,
      },
    });

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_3",
      },
    });

    const result = await handleCancelBooking({
      bookingData: {
        id: idOfBookingToBeCancelled,
        uid: uidOfBookingToBeCancelled,
        cancelledBy: primaryHost.email,
        cancellationReason: "Testing EMAIL_HOST workflow sends to secondary host in round robin",
      },
      impersonatedByUserUuid: null,
      actionSource: "WEBAPP",
    });

    expect(result.success).toBe(true);
    expect(result.bookingId).toBe(idOfBookingToBeCancelled);
    expect(result.bookingUid).toBe(uidOfBookingToBeCancelled);

    expectWorkflowToBeTriggered({
      emailsToReceive: [primaryHost.email, secondaryHost.email],
      emails,
    });
  });

  test("Should block cancelling past bookings", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "past-booking";
    const idOfBookingToBeCancelled = 3040;
    const { dateString: minus1DateString } = getDate({ dateIncrement: -1 });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${minus1DateString}T05:00:00.000Z`,
            endTime: `${minus1DateString}T05:30:00.000Z`,
          },
        ],
        organizer,
        apps: [TestData.apps["daily-video"]],
      })
    );

    // This should throw an error with current implementation
    await expect(
      handleCancelBooking({
        bookingData: {
          id: idOfBookingToBeCancelled,
          uid: uidOfBookingToBeCancelled,
          cancelledBy: organizer.email,
          cancellationReason: "Testing past booking cancellation",
        },
        impersonatedByUserUuid: null,
        actionSource: "WEBAPP",
      })
    ).rejects.toThrow("Cannot cancel a booking that has already ended");
  });

  test("Should block canceling bookings without a cancellation reason when cancelledBy is set to the host", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "cancelled-booking";
    const idOfBookingToBeCancelled = 3040;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:30:00.000Z`,
          },
        ],
        organizer,
        apps: [TestData.apps["daily-video"]],
      })
    );

    // This should throw an error with current implementation
    await expect(
      handleCancelBooking({
        bookingData: {
          id: idOfBookingToBeCancelled,
          uid: uidOfBookingToBeCancelled,
          cancelledBy: organizer.email,
        },
        impersonatedByUserUuid: null,
        actionSource: "WEBAPP",
      })
    ).rejects.toThrow("Cancellation reason is required");
  });

  test("Should not charge cancellation fee when organizer cancels booking", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "cancellation-fee-organizer-test";
    const idOfBookingToBeCancelled = 4050;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            users: [{ id: 101 }],
            metadata: {
              apps: {
                stripe: {
                  enabled: true,
                  paymentOption: "HOLD",
                  price: 1000,
                  currency: "usd",
                  cancellationFeeEnabled: true,
                  cancellationFeeTimeValue: 2,
                  cancellationFeeTimeUnit: "hours",
                },
              },
            },
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:30:00.000Z`,
            attendees: [
              {
                email: booker.email,
                timeZone: "Asia/Kolkata",
              },
            ],
          },
        ],
        payment: [
          {
            amount: 1000,
            bookingId: idOfBookingToBeCancelled,
            currency: "usd",
            data: {},
            externalId: "ext_id_cancellation",
            fee: 0,
            refunded: false,
            success: false,
            uid: uidOfBookingToBeCancelled,
            paymentOption: "HOLD",
          },
        ],
        organizer,
        apps: [TestData.apps["daily-video"]],
      })
    );

    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
      videoMeetingData: {
        id: "MOCK_ID",
        password: "MOCK_PASS",
        url: `http://mock-dailyvideo.example.com/meeting-cancellation`,
      },
    });

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_CANCELLATION",
      },
    });

    const result = await handleCancelBooking({
      bookingData: {
        id: idOfBookingToBeCancelled,
        uid: uidOfBookingToBeCancelled,
        cancelledBy: organizer.email,
        cancellationReason: "No reason",
      },
      impersonatedByUserUuid: null,
      actionSource: "WEBAPP",
    });

    expect(result.success).toBe(true);
  });

  test("Should not charge cancellation fee when team admin cancels booking", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Team Admin",
      email: "admin@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const teamMember = getOrganizer({
      name: "Team Member",
      email: "member@example.com",
      id: 102,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "cancellation-fee-team-admin-test";
    const idOfBookingToBeCancelled = 4060;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 2,
            slotInterval: 30,
            length: 30,
            teamId: 1,
            users: [{ id: 101 }, { id: 102 }],
            hosts: [
              { userId: 101, isFixed: false },
              { userId: 102, isFixed: false },
            ],
            metadata: {
              apps: {
                stripe: {
                  enabled: true,
                  paymentOption: "HOLD",
                  price: 1000,
                  currency: "usd",
                  cancellationFeeEnabled: true,
                  cancellationFeeTimeValue: 1,
                  cancellationFeeTimeUnit: "hours",
                },
              },
            },
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            eventTypeId: 2,
            userId: 102,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:30:00.000Z`,
            attendees: [
              {
                email: booker.email,
                timeZone: "Asia/Kolkata",
              },
            ],
          },
        ],
        payment: [
          {
            amount: 1000,
            bookingId: idOfBookingToBeCancelled,
            currency: "usd",
            data: {},
            externalId: "ext_id_team_cancellation",
            fee: 0,
            refunded: false,
            success: false,
            uid: uidOfBookingToBeCancelled,
            paymentOption: "HOLD",
          },
        ],
        users: [organizer, teamMember],
        apps: [TestData.apps["daily-video"]],
      })
    );

    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
      videoMeetingData: {
        id: "MOCK_ID",
        password: "MOCK_PASS",
        url: `http://mock-dailyvideo.example.com/meeting-team-cancellation`,
      },
    });

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_TEAM_CANCELLATION",
      },
    });

    const result = await handleCancelBooking({
      bookingData: {
        id: idOfBookingToBeCancelled,
        uid: uidOfBookingToBeCancelled,
        cancelledBy: organizer.email,
        cancellationReason: "No reason",
      },
      impersonatedByUserUuid: null,
      actionSource: "WEBAPP",
    });

    expect(result.success).toBe(true);
  });

  test("Should allow hosts to cancel bookings when disableCancelling is enabled", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "disable-cancelling-host-test";
    const idOfBookingToBeCancelled = 8090;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            disableCancelling: true,
            users: [{ id: 101 }],
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:30:00.000Z`,
            attendees: [
              {
                email: booker.email,
                timeZone: "Asia/Kolkata",
              },
            ],
          },
        ],
        organizer,
        apps: [TestData.apps["daily-video"]],
      })
    );

    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
      videoMeetingData: {
        id: "MOCK_ID",
        password: "MOCK_PASS",
        url: `http://mock-dailyvideo.example.com/meeting-disable-cancel`,
      },
    });

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_DISABLE_CANCEL",
      },
    });

    const result = await handleCancelBooking({
      bookingData: {
        id: idOfBookingToBeCancelled,
        uid: uidOfBookingToBeCancelled,
        cancelledBy: organizer.email,
        cancellationReason: "Host cancelling despite disableCancelling",
      },
      userId: organizer.id,
      actionSource: "WEBAPP",
    });

    expect(result.success).toBe(true);
    expect(result.bookingId).toBe(idOfBookingToBeCancelled);
  });

  test("Should not allow guests to cancel bookings when disableCancelling is enabled", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "disable-cancelling-guest-test";
    const idOfBookingToBeCancelled = 8091;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            disableCancelling: true,
            users: [{ id: 101 }],
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:30:00.000Z`,
            attendees: [
              {
                email: booker.email,
                timeZone: "Asia/Kolkata",
              },
            ],
          },
        ],
        organizer,
        apps: [TestData.apps["daily-video"]],
      })
    );

    await expect(
      handleCancelBooking({
        bookingData: {
          id: idOfBookingToBeCancelled,
          uid: uidOfBookingToBeCancelled,
          cancelledBy: booker.email,
          cancellationReason: "Guest trying to cancel",
        },
        userId: 999, // Not the host
        actionSource: "WEBAPP",
      })
    ).rejects.toThrow("This event type does not allow cancellations");
  });

  test("Should allow event type hosts to cancel bookings when disableCancelling is enabled", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const eventTypeHost = getOrganizer({
      name: "Event Type Host",
      email: "host@example.com",
      id: 102,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "disable-cancelling-event-type-host-test";
    const idOfBookingToBeCancelled = 8092;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            disableCancelling: true,
            users: [{ id: 101 }],
            hosts: [
              {
                userId: 102,
                isFixed: false,
              },
            ],
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:30:00.000Z`,
            attendees: [
              {
                email: booker.email,
                timeZone: "Asia/Kolkata",
              },
              {
                email: eventTypeHost.email, // Host is assigned to this booking
                timeZone: "Asia/Kolkata",
              },
            ],
          },
        ],
        organizer,
        usersApartFromOrganizer: [eventTypeHost],
        apps: [TestData.apps["daily-video"]],
      })
    );

    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
      videoMeetingData: {
        id: "MOCK_ID",
        password: "MOCK_PASS",
        url: `http://mock-dailyvideo.example.com/meeting-disable-cancel-host`,
      },
    });

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_DISABLE_CANCEL_HOST",
      },
    });

    // Event type host assigned to this booking should be able to cancel
    const result = await handleCancelBooking({
      bookingData: {
        id: idOfBookingToBeCancelled,
        uid: uidOfBookingToBeCancelled,
        cancelledBy: eventTypeHost.email,
        cancellationReason: "Event type host cancelling despite disableCancelling",
      },
      userId: eventTypeHost.id, // Event type host assigned to booking
      actionSource: "WEBAPP",
    });

    expect(result.success).toBe(true);
    expect(result.bookingId).toBe(idOfBookingToBeCancelled);
  });

  test("Should not allow non-assigned event type hosts to cancel bookings when disableCancelling is enabled", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const eventTypeHost = getOrganizer({
      name: "Event Type Host",
      email: "host@example.com",
      id: 102,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const nonAssignedHost = getOrganizer({
      name: "Non-Assigned Host",
      email: "nonassigned@example.com",
      id: 103,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "disable-cancelling-non-assigned-host-test";
    const idOfBookingToBeCancelled = 8093;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            disableCancelling: true,
            users: [{ id: 101 }],
            hosts: [
              {
                userId: 102,
                isFixed: false,
              },
              {
                userId: 103, // Non-assigned host on event type
                isFixed: false,
              },
            ],
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:30:00.000Z`,
            attendees: [
              {
                email: booker.email,
                timeZone: "Asia/Kolkata",
              },
              {
                email: eventTypeHost.email, // Only this host is assigned
                timeZone: "Asia/Kolkata",
              },
              // nonAssignedHost is NOT in attendees
            ],
          },
        ],
        organizer,
        usersApartFromOrganizer: [eventTypeHost, nonAssignedHost],
        apps: [TestData.apps["daily-video"]],
      })
    );

    // Non-assigned host (userId 103) should NOT be able to cancel
    await expect(
      handleCancelBooking({
        bookingData: {
          id: idOfBookingToBeCancelled,
          uid: uidOfBookingToBeCancelled,
          cancelledBy: nonAssignedHost.email,
          cancellationReason: "Non-assigned host trying to cancel",
        },
        userId: nonAssignedHost.id, // Host on event type but not assigned to booking
        actionSource: "WEBAPP",
      })
    ).rejects.toThrow("This event type does not allow cancellations");
  });

  test("Should block unauthenticated cancellation when disableCancelling is enabled (security: prevent cancelledBy spoofing)", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "unauthenticated-spoof-test";
    const idOfBookingToBeCancelled = 8094;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            disableCancelling: true,
            users: [{ id: 101 }],
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:30:00.000Z`,
            attendees: [
              {
                email: booker.email,
                timeZone: "Asia/Kolkata",
              },
            ],
          },
        ],
        organizer,
        apps: [TestData.apps["daily-video"]],
      })
    );

    // Unauthenticated user (userId = -1) trying to spoof host via cancelledBy
    // Should be blocked even though cancelledBy matches organizer email
    await expect(
      handleCancelBooking({
        bookingData: {
          id: idOfBookingToBeCancelled,
          uid: uidOfBookingToBeCancelled,
          cancelledBy: organizer.email, // Attempting to spoof as organizer
          cancellationReason: "Trying to bypass disableCancelling via spoofed email",
        },
        userId: -1, // Unauthenticated (sentinel value from apps/web/app/api/cancel/route.ts)
        actionSource: "WEBAPP",
      })
    ).rejects.toThrow("This event type does not allow cancellations");
  });

  test("Should block cancellation with invalid userId even when cancelledBy matches organizer (security: prevent cancelledBy spoofing)", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "invalid-userid-spoof-test";
    const idOfBookingToBeCancelled = 8095;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            disableCancelling: true,
            users: [{ id: 101 }],
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:30:00.000Z`,
            attendees: [
              {
                email: booker.email,
                timeZone: "Asia/Kolkata",
              },
            ],
          },
        ],
        organizer,
        apps: [TestData.apps["daily-video"]],
      })
    );

    // Attacker with arbitrary userId trying to spoof host via cancelledBy
    // Should be blocked - cancelledBy is untrusted user input
    await expect(
      handleCancelBooking({
        bookingData: {
          id: idOfBookingToBeCancelled,
          uid: uidOfBookingToBeCancelled,
          cancelledBy: organizer.email, // Attempting to spoof as organizer
          cancellationReason: "Attacker trying to bypass disableCancelling",
        },
        userId: 999, // Random userId that doesn't match any host
        actionSource: "WEBAPP",
      })
    ).rejects.toThrow("This event type does not allow cancellations");
  });

  test("Should treat unauthenticated cancellation as guest cancellation (requires reason based on guest rules)", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "unauthenticated-reason-test";
    const idOfBookingToBeCancelled = 8096;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            disableCancelling: false, // Guests can cancel
            requiresCancellationReason: "MANDATORY_ATTENDEE_ONLY", // Guests must provide reason
            users: [{ id: 101 }],
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:30:00.000Z`,
            attendees: [
              {
                email: booker.email,
                timeZone: "Asia/Kolkata",
              },
            ],
          },
        ],
        organizer,
        apps: [TestData.apps["daily-video"]],
      })
    );

    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
      videoMeetingData: {
        id: "MOCK_ID",
        password: "MOCK_PASS",
        url: `http://mock-dailyvideo.example.com/unauthenticated-reason-test`,
      },
    });

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_UNAUTH_REASON",
      },
    });

    // Unauthenticated user (userId = -1) should be treated as guest
    // and required to provide cancellation reason per MANDATORY_ATTENDEE_ONLY rule
    await expect(
      handleCancelBooking({
        bookingData: {
          id: idOfBookingToBeCancelled,
          uid: uidOfBookingToBeCancelled,
          cancelledBy: organizer.email, // Even if this matches organizer
          cancellationReason: "", // Missing required reason
        },
        userId: -1, // Unauthenticated
        actionSource: "WEBAPP",
      })
    ).rejects.toThrow("Cancellation reason is required");

    // Should succeed with reason provided
    const result = await handleCancelBooking({
      bookingData: {
        id: idOfBookingToBeCancelled,
        uid: uidOfBookingToBeCancelled,
        cancelledBy: organizer.email,
        cancellationReason: "Guest providing required reason",
      },
      userId: -1, // Unauthenticated - treated as guest
      actionSource: "WEBAPP",
    });

    expect(result.success).toBe(true);
  });

  test("Should charge cancellation fee when attendee cancels within time threshold", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "cancellation-fee-attendee-test";
    const idOfBookingToBeCancelled = 4070;

    const now = new Date();
    const startTime = new Date(now.getTime() + 30 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            users: [{ id: 101 }],
            metadata: {
              apps: {
                stripe: {
                  enabled: true,
                  paymentOption: "HOLD",
                  price: 1000,
                  currency: "usd",
                  cancellationFeeEnabled: true,
                  cancellationFeeTimeValue: 1,
                  cancellationFeeTimeUnit: "hours",
                },
              },
            },
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            attendees: [
              {
                email: booker.email,
                timeZone: "Asia/Kolkata",
              },
            ],
          },
        ],
        payment: [
          {
            amount: 1000,
            bookingId: idOfBookingToBeCancelled,
            currency: "usd",
            data: {},
            externalId: "ext_id_attendee_cancellation",
            fee: 0,
            refunded: false,
            success: false,
            uid: uidOfBookingToBeCancelled,
            paymentOption: "HOLD",
            appId: "stripe",
          },
        ],
        organizer,
        apps: [TestData.apps["daily-video"]],
      })
    );

    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
      videoMeetingData: {
        id: "MOCK_ID",
        password: "MOCK_PASS",
        url: `http://mock-dailyvideo.example.com/meeting-attendee-cancellation`,
      },
    });

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_ATTENDEE_CANCELLATION",
      },
    });

    const result = await handleCancelBooking({
      bookingData: {
        id: idOfBookingToBeCancelled,
        uid: uidOfBookingToBeCancelled,
        cancelledBy: booker.email,
        cancellationReason: "Attendee cancelled within time threshold",
      },
      userId: 999,
      impersonatedByUserUuid: null,
      actionSource: "WEBAPP",
    });

    expect(result.success).toBe(true);
  });

  test("Should trigger BOOKING_CANCELLED webhook with username and usernameInOrg for organization bookings", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      username: "organizer-username",
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "org-booking-uid";
    const idOfBookingToBeCancelled = 5080;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData(
        {
          webhooks: [
            {
              userId: organizer.id,
              eventTriggers: ["BOOKING_CANCELLED"],
              subscriberUrl: "http://my-webhook.example.com",
              active: true,
              eventTypeId: 1,
              appId: null,
            },
          ],
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          bookings: [
            {
              id: idOfBookingToBeCancelled,
              uid: uidOfBookingToBeCancelled,
              attendees: [
                {
                  email: booker.email,
                },
              ],
              eventTypeId: 1,
              userId: 101,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:15:00.000Z`,
              metadata: {
                videoCallUrl: "https://existing-daily-video-call-url.example.com",
              },
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"]],
        },
        {
          id: 1,
          profileUsername: "username-in-org",
        }
      )
    );

    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
      videoMeetingData: {
        id: "MOCK_ID",
        password: "MOCK_PASS",
        url: `http://mock-dailyvideo.example.com/meeting-org`,
      },
    });

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_ORG",
      },
    });

    await handleCancelBooking({
      bookingData: {
        id: idOfBookingToBeCancelled,
        uid: uidOfBookingToBeCancelled,
        cancelledBy: organizer.email,
        cancellationReason: "Organization booking cancellation test",
      },
      impersonatedByUserUuid: null,
      actionSource: "WEBAPP",
    });

    expectBookingCancelledWebhookToHaveBeenFired({
      booker,
      organizer: {
        ...organizer,
        usernameInOrg: "username-in-org",
      },
      location: BookingLocations.CalVideo,
      subscriberUrl: "http://my-webhook.example.com",
      payload: {
        cancelledBy: organizer.email,
        organizer: {
          id: organizer.id,
          username: organizer.username,
          email: organizer.email,
          name: organizer.name,
          timeZone: organizer.timeZone,
        },
      },
    });
  });

  test("Should cancel seated event and delete all attendees when seatsPerTimeSlot is enabled", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const attendee2 = getBooker({
      email: "attendee2@example.com",
      name: "Attendee 2",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "seated-event-booking";
    const idOfBookingToBeCancelled = 4050;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            seatsPerTimeSlot: 5, // Enable seated events
            users: [
              {
                id: 101,
              },
            ],
            hosts: [
              {
                id: 101,
                userId: 101,
              },
            ],
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            attendees: [
              {
                email: booker.email,
              },
              {
                email: attendee2.email,
              },
            ],
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:30:00.000Z`,
          },
        ],
        organizer,
        apps: [TestData.apps["daily-video"]],
      })
    );

    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
      videoMeetingData: {
        id: "MOCK_ID",
        password: "MOCK_PASS",
        url: `http://mock-dailyvideo.example.com/meeting-seated`,
      },
    });

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_SEATED",
      },
    });

    const result = await handleCancelBooking({
      bookingData: {
        id: idOfBookingToBeCancelled,
        uid: uidOfBookingToBeCancelled,
        cancelledBy: organizer.email,
        cancellationReason: "Cancelling seated event",
      },
      userId: organizer.id,
      impersonatedByUserUuid: null,
      actionSource: "WEBAPP",
    });

    expect(result.success).toBe(true);
    expect(result.onlyRemovedAttendee).toBe(false);
    expect(result.bookingId).toBe(idOfBookingToBeCancelled);
  });

  test("Should cancel all remaining recurring bookings when allRemainingBookings is true", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "recurring-booking-1";
    const idOfBookingToBeCancelled = 5060;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
    const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
    const recurringEventId = "recurring-event-123";

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            recurringEvent: {
              freq: 2, // weekly
              count: 3,
              interval: 1,
            },
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            recurringEventId,
            attendees: [
              {
                email: booker.email,
              },
            ],
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:30:00.000Z`,
          },
          // Additional recurring booking instance
          {
            id: idOfBookingToBeCancelled + 1,
            uid: "recurring-booking-2",
            recurringEventId,
            attendees: [
              {
                email: booker.email,
              },
            ],
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus2DateString}T05:00:00.000Z`,
            endTime: `${plus2DateString}T05:30:00.000Z`,
          },
        ],
        organizer,
        apps: [TestData.apps["daily-video"]],
      })
    );

    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
      videoMeetingData: {
        id: "MOCK_ID",
        password: "MOCK_PASS",
        url: `http://mock-dailyvideo.example.com/meeting-recurring`,
      },
    });

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_RECURRING",
      },
    });

    const result = await handleCancelBooking({
      bookingData: {
        id: idOfBookingToBeCancelled,
        uid: uidOfBookingToBeCancelled,
        cancelledBy: organizer.email,
        cancellationReason: "Cancelling all remaining recurring bookings",
        allRemainingBookings: true,
      },
      userId: organizer.id,
      impersonatedByUserUuid: null,
      actionSource: "WEBAPP",
    });

    expect(result.success).toBe(true);
    expect(result.onlyRemovedAttendee).toBe(false);
    expect(result.bookingId).toBe(idOfBookingToBeCancelled);
  });

  test("Should cancel subsequent bookings when cancelSubsequentBookings is true", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "recurring-subsequent-1";
    const idOfBookingToBeCancelled = 6070;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
    const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
    const recurringEventId = "recurring-subsequent-456";

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            recurringEvent: {
              freq: 2, // weekly
              count: 3,
              interval: 1,
            },
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            recurringEventId,
            attendees: [
              {
                email: booker.email,
              },
            ],
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:30:00.000Z`,
          },
          // Subsequent booking that should be cancelled
          {
            id: idOfBookingToBeCancelled + 1,
            uid: "recurring-subsequent-2",
            recurringEventId,
            attendees: [
              {
                email: booker.email,
              },
            ],
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus2DateString}T05:00:00.000Z`,
            endTime: `${plus2DateString}T05:30:00.000Z`,
          },
        ],
        organizer,
        apps: [TestData.apps["daily-video"]],
      })
    );

    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
      videoMeetingData: {
        id: "MOCK_ID",
        password: "MOCK_PASS",
        url: `http://mock-dailyvideo.example.com/meeting-subsequent`,
      },
    });

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_SUBSEQUENT",
      },
    });

    const result = await handleCancelBooking({
      bookingData: {
        id: idOfBookingToBeCancelled,
        uid: uidOfBookingToBeCancelled,
        cancelledBy: organizer.email,
        cancellationReason: "Cancelling this and all subsequent bookings",
        cancelSubsequentBookings: true,
      },
      userId: organizer.id,
      impersonatedByUserUuid: null,
      actionSource: "WEBAPP",
    });

    expect(result.success).toBe(true);
    expect(result.onlyRemovedAttendee).toBe(false);
    expect(result.bookingId).toBe(idOfBookingToBeCancelled);
  });

  test("Should handle booking reference cleanup during cancellation", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const uidOfBookingToBeCancelled = "booking-with-references";
    const idOfBookingToBeCancelled = 7080;
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        bookings: [
          {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            attendees: [
              {
                email: booker.email,
              },
            ],
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            status: BookingStatus.ACCEPTED,
            startTime: `${plus1DateString}T05:00:00.000Z`,
            endTime: `${plus1DateString}T05:30:00.000Z`,
            references: [
              {
                id: 1,
                type: "daily_video",
                uid: "daily-meeting-ref",
                meetingId: "daily123",
                meetingUrl: "https://daily.co/meeting123",
                meetingPassword: "pass123",
                credentialId: 1,
                deleted: null,
              },
              {
                id: 2,
                type: "google_calendar",
                uid: "gcal-event-ref",
                meetingId: "gcal456",
                meetingUrl: null,
                meetingPassword: null,
                credentialId: 2,
                deleted: null,
              },
            ],
          },
        ],
        organizer,
        apps: [TestData.apps["daily-video"], TestData.apps["google-calendar"]],
      })
    );

    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
      videoMeetingData: {
        id: "MOCK_ID",
        password: "MOCK_PASS",
        url: `http://mock-dailyvideo.example.com/meeting-references`,
      },
    });

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_REFERENCES",
      },
    });

    const result = await handleCancelBooking({
      bookingData: {
        id: idOfBookingToBeCancelled,
        uid: uidOfBookingToBeCancelled,
        cancelledBy: organizer.email,
        cancellationReason: "Testing booking reference cleanup",
      },
      userId: organizer.id,
      impersonatedByUserUuid: null,
      actionSource: "WEBAPP",
    });

    expect(result.success).toBe(true);
    expect(result.onlyRemovedAttendee).toBe(false);
    expect(result.bookingId).toBe(idOfBookingToBeCancelled);
  });

  describe("Cancellation Reason Requirement", () => {
    test("Should block host cancellation without reason when requiresCancellationReason is MANDATORY_BOTH", async () => {
      const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      const uidOfBookingToBeCancelled = "mandatory-both-host-test";
      const idOfBookingToBeCancelled = 8001;
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              requiresCancellationReason: "MANDATORY_BOTH",
              users: [{ id: 101 }],
            },
          ],
          bookings: [
            {
              id: idOfBookingToBeCancelled,
              uid: uidOfBookingToBeCancelled,
              eventTypeId: 1,
              userId: 101,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:30:00.000Z`,
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"]],
        })
      );

      await expect(
        handleCancelBooking({
          bookingData: {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            cancelledBy: organizer.email,
          },
        })
      ).rejects.toThrow("Cancellation reason is required");
    });

    test("Should block attendee cancellation without reason when requiresCancellationReason is MANDATORY_BOTH", async () => {
      const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      const uidOfBookingToBeCancelled = "mandatory-both-attendee-test";
      const idOfBookingToBeCancelled = 8002;
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              requiresCancellationReason: "MANDATORY_BOTH",
              users: [{ id: 101 }],
            },
          ],
          bookings: [
            {
              id: idOfBookingToBeCancelled,
              uid: uidOfBookingToBeCancelled,
              eventTypeId: 1,
              userId: 101,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:30:00.000Z`,
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"]],
        })
      );

      await expect(
        handleCancelBooking({
          bookingData: {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            cancelledBy: booker.email,
          },
        })
      ).rejects.toThrow("Cancellation reason is required");
    });

    test("Should block attendee cancellation without reason when requiresCancellationReason is MANDATORY_ATTENDEE_ONLY", async () => {
      const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      const uidOfBookingToBeCancelled = "mandatory-attendee-only-test";
      const idOfBookingToBeCancelled = 8003;
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              requiresCancellationReason: "MANDATORY_ATTENDEE_ONLY",
              users: [{ id: 101 }],
            },
          ],
          bookings: [
            {
              id: idOfBookingToBeCancelled,
              uid: uidOfBookingToBeCancelled,
              eventTypeId: 1,
              userId: 101,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:30:00.000Z`,
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"]],
        })
      );

      await expect(
        handleCancelBooking({
          bookingData: {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            cancelledBy: booker.email,
          },
        })
      ).rejects.toThrow("Cancellation reason is required");
    });

    test("Should allow host cancellation without reason when requiresCancellationReason is MANDATORY_ATTENDEE_ONLY", async () => {
      const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      const uidOfBookingToBeCancelled = "mandatory-attendee-host-allowed-test";
      const idOfBookingToBeCancelled = 8004;
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              requiresCancellationReason: "MANDATORY_ATTENDEE_ONLY",
              users: [{ id: 101 }],
            },
          ],
          bookings: [
            {
              id: idOfBookingToBeCancelled,
              uid: uidOfBookingToBeCancelled,
              eventTypeId: 1,
              userId: 101,
              attendees: [{ email: booker.email, timeZone: "Asia/Kolkata" }],
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:30:00.000Z`,
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"]],
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
          url: `http://mock-dailyvideo.example.com/meeting-attendee-only`,
        },
      });

      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_ATTENDEE_ONLY",
        },
      });

      const result = await handleCancelBooking({
        bookingData: {
          id: idOfBookingToBeCancelled,
          uid: uidOfBookingToBeCancelled,
          cancelledBy: organizer.email,
        },
      });

      expect(result.success).toBe(true);
    });

    test("Should allow host cancellation without reason when requiresCancellationReason is OPTIONAL_BOTH", async () => {
      const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      const uidOfBookingToBeCancelled = "optional-both-host-test";
      const idOfBookingToBeCancelled = 8005;
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              requiresCancellationReason: "OPTIONAL_BOTH",
              users: [{ id: 101 }],
            },
          ],
          bookings: [
            {
              id: idOfBookingToBeCancelled,
              uid: uidOfBookingToBeCancelled,
              eventTypeId: 1,
              userId: 101,
              attendees: [{ email: booker.email, timeZone: "Asia/Kolkata" }],
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:30:00.000Z`,
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"]],
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
          url: `http://mock-dailyvideo.example.com/meeting-optional-host`,
        },
      });

      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_OPTIONAL_HOST",
        },
      });

      const result = await handleCancelBooking({
        bookingData: {
          id: idOfBookingToBeCancelled,
          uid: uidOfBookingToBeCancelled,
          cancelledBy: organizer.email,
        },
      });

      expect(result.success).toBe(true);
    });

    test("Should allow attendee cancellation without reason when requiresCancellationReason is OPTIONAL_BOTH", async () => {
      const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      const uidOfBookingToBeCancelled = "optional-both-attendee-test";
      const idOfBookingToBeCancelled = 8006;
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              requiresCancellationReason: "OPTIONAL_BOTH",
              users: [{ id: 101 }],
            },
          ],
          bookings: [
            {
              id: idOfBookingToBeCancelled,
              uid: uidOfBookingToBeCancelled,
              eventTypeId: 1,
              userId: 101,
              attendees: [{ email: booker.email, timeZone: "Asia/Kolkata" }],
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:30:00.000Z`,
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"]],
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
          url: `http://mock-dailyvideo.example.com/meeting-optional-attendee`,
        },
      });

      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_OPTIONAL_ATTENDEE",
        },
      });

      const result = await handleCancelBooking({
        bookingData: {
          id: idOfBookingToBeCancelled,
          uid: uidOfBookingToBeCancelled,
          cancelledBy: booker.email,
        },
      });

      expect(result.success).toBe(true);
    });

    test("Should allow attendee cancellation without reason when requiresCancellationReason is MANDATORY_HOST_ONLY", async () => {
      const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      const uidOfBookingToBeCancelled = "mandatory-host-attendee-allowed-test";
      const idOfBookingToBeCancelled = 8007;
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              requiresCancellationReason: "MANDATORY_HOST_ONLY",
              users: [{ id: 101 }],
            },
          ],
          bookings: [
            {
              id: idOfBookingToBeCancelled,
              uid: uidOfBookingToBeCancelled,
              eventTypeId: 1,
              userId: 101,
              attendees: [{ email: booker.email, timeZone: "Asia/Kolkata" }],
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:30:00.000Z`,
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"]],
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
          url: `http://mock-dailyvideo.example.com/meeting-host-only-attendee`,
        },
      });

      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_HOST_ONLY_ATTENDEE",
        },
      });

      const result = await handleCancelBooking({
        bookingData: {
          id: idOfBookingToBeCancelled,
          uid: uidOfBookingToBeCancelled,
          cancelledBy: booker.email,
        },
      });

      expect(result.success).toBe(true);
    });

    test("Should block host cancellation without reason when requiresCancellationReason is null (default behavior)", async () => {
      const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      const uidOfBookingToBeCancelled = "null-default-host-test";
      const idOfBookingToBeCancelled = 8008;
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              users: [{ id: 101 }],
            },
          ],
          bookings: [
            {
              id: idOfBookingToBeCancelled,
              uid: uidOfBookingToBeCancelled,
              eventTypeId: 1,
              userId: 101,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:30:00.000Z`,
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"]],
        })
      );

      await expect(
        handleCancelBooking({
          bookingData: {
            id: idOfBookingToBeCancelled,
            uid: uidOfBookingToBeCancelled,
            cancelledBy: organizer.email,
          },
        })
      ).rejects.toThrow("Cancellation reason is required");
    });

    test("Should allow attendee cancellation without reason when requiresCancellationReason is null (default behavior)", async () => {
      const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      const uidOfBookingToBeCancelled = "null-default-attendee-test";
      const idOfBookingToBeCancelled = 8009;
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              users: [{ id: 101 }],
            },
          ],
          bookings: [
            {
              id: idOfBookingToBeCancelled,
              uid: uidOfBookingToBeCancelled,
              eventTypeId: 1,
              userId: 101,
              attendees: [{ email: booker.email, timeZone: "Asia/Kolkata" }],
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:30:00.000Z`,
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"]],
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
          url: `http://mock-dailyvideo.example.com/meeting-null-default`,
        },
      });

      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID_NULL_DEFAULT",
        },
      });

      const result = await handleCancelBooking({
        bookingData: {
          id: idOfBookingToBeCancelled,
          uid: uidOfBookingToBeCancelled,
          cancelledBy: booker.email,
        },
      });

      expect(result.success).toBe(true);
    });
  });
});
