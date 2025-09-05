import {
  BookingLocations,
  createBookingScenario,
  getBooker,
  getGoogleCalendarCredential,
  getOrganizer,
  getScenarioData,
  mockCalendarToHaveNoBusySlots,
  mockSuccessfulVideoMeetingCreation,
  TestData,
  getDate,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  expectBookingCancelledWebhookToHaveBeenFired,
  expectWorkflowToBeTriggered,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, expect, vi } from "vitest";

import { processPaymentRefund } from "@calcom/lib/payment/processPaymentRefund";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

vi.mock("@calcom/lib/payment/processPaymentRefund", () => ({
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
      },
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
      },
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
        teams: [
          {
            id: 1,
            name: "Test Team",
            slug: "test-team",
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
      })
    ).rejects.toThrow("Cannot cancel a booking that has already ended");
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
      },
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
        teams: [
          {
            id: 1,
            name: "Test Team",
            slug: "test-team",
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
      },
    });

    expect(result.success).toBe(true);
  });

  test("Should charge cancellation fee when attendee cancels within time threshold", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
      id: 999,
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
    });

    expect(result.success).toBe(true);
  });
});
