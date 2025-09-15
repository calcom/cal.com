import {
  createBookingScenario,
  getBooker,
  getOrganizer,
  getScenarioData,
  TestData,
  getDate,
  mockCalendarToHaveNoBusySlots,
  mockSuccessfulVideoMeetingCreation,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  expectBookingCancelledWebhookToHaveBeenFired,
  expectWebhookToHaveBeenCalledWith,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, expect, vi, beforeEach, afterEach, test } from "vitest";

import dayjs from "@calcom/dayjs";
import { HttpError } from "@calcom/lib/http-error";
import { BookingStatus } from "@calcom/prisma/enums";

vi.mock("@calcom/lib/payment/processPaymentRefund", () => ({
  processPaymentRefund: vi.fn(),
}));

describe("handleCancelBooking - Minimum Cancellation Notice", () => {
  setupAndTeardown();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("Should block cancellation within 24-hour minimum notice period", async () => {
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
    });

    const bookingUid = "h5Wv3eHgconAED2j4gcVhP";
    const bookingId = 1020;

    // Create a booking that starts in 2 hours
    const bookingStartTime = dayjs().add(2, "hours");

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            minimumCancellationNotice: 1440, // 24 hours in minutes
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        bookings: [
          {
            id: bookingId,
            uid: bookingUid,
            eventTypeId: 1,
            userId: 101,
            responses: {
              email: booker.email,
              name: booker.name,
            },
            status: BookingStatus.ACCEPTED,
            startTime: bookingStartTime.toISOString(),
            endTime: bookingStartTime.add(30, "minutes").toISOString(),
          },
        ],
        organizer,
      })
    );

    // Attempt to cancel the booking
    await expect(
      handleCancelBooking({
        bookingData: {
          uid: bookingUid,
          cancellationReason: "Cannot make it",
        },
        userId: 101,
      })
    ).rejects.toThrow(HttpError);

    try {
      await handleCancelBooking({
        bookingData: {
          uid: bookingUid,
          cancellationReason: "Cannot make it",
        },
        userId: 101,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(403);
      expect((error as HttpError).message).toContain("Cannot cancel within 24 hours of event start");
    }
  });

  test("Should allow cancellation outside minimum notice period", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 102,
      schedules: [TestData.schedules.IstWorkHours],
    });

    const bookingUid = "h5Wv3eHgconAED2j4gcVhQ";
    const bookingId = 1021;

    // Create a booking that starts in 48 hours
    const bookingStartTime = dayjs().add(48, "hours");

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
            minimumCancellationNotice: 1440, // 24 hours in minutes
            users: [
              {
                id: 102,
              },
            ],
          },
        ],
        bookings: [
          {
            id: bookingId,
            uid: bookingUid,
            eventTypeId: 2,
            userId: 102,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "integrations:daily" },
            },
            status: BookingStatus.ACCEPTED,
            startTime: bookingStartTime.toISOString(),
            endTime: bookingStartTime.add(30, "minutes").toISOString(),
          },
        ],
        organizer,
      })
    );

    // Should successfully cancel the booking
    const result = await handleCancelBooking({
      bookingData: {
        uid: bookingUid,
        cancellationReason: "Schedule conflict",
      },
      userId: 102,
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("Booking successfully cancelled.");
    expect(result.bookingUid).toBe(bookingUid);

    expectBookingCancelledWebhookToHaveBeenFired({
      booker,
      organizer,
      location: "integrations:daily",
      subscriberUrl: "http://my-webhook.example.com",
      cancelledBy: organizer.email,
    });
  });

  test("Should format error message correctly for different time periods", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const testCases = [
      {
        minutes: 30,
        expectedMessage: "Cannot cancel within 30 minutes of event start",
        hoursBeforeEvent: 0.25,
      },
      {
        minutes: 60,
        expectedMessage: "Cannot cancel within 1 hour of event start",
        hoursBeforeEvent: 0.5,
      },
      {
        minutes: 90,
        expectedMessage: "Cannot cancel within 1 hour and 30 minutes of event start",
        hoursBeforeEvent: 1,
      },
      {
        minutes: 120,
        expectedMessage: "Cannot cancel within 2 hours of event start",
        hoursBeforeEvent: 1.5,
      },
      {
        minutes: 2880,
        expectedMessage: "Cannot cancel within 48 hours of event start",
        hoursBeforeEvent: 24,
      },
    ];

    for (const testCase of testCases) {
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 103 + testCases.indexOf(testCase),
        schedules: [TestData.schedules.IstWorkHours],
      });

      const bookingUid = `booking-${testCase.minutes}`;
      const bookingId = 2000 + testCases.indexOf(testCase);

      // Create a booking that violates the minimum notice
      const bookingStartTime = dayjs().add(testCase.hoursBeforeEvent, "hours");

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 100 + testCases.indexOf(testCase),
              slotInterval: 30,
              length: 30,
              minimumCancellationNotice: testCase.minutes,
              users: [
                {
                  id: 103 + testCases.indexOf(testCase),
                },
              ],
            },
          ],
          bookings: [
            {
              id: bookingId,
              uid: bookingUid,
              eventTypeId: 100 + testCases.indexOf(testCase),
              userId: 103 + testCases.indexOf(testCase),
              responses: {
                email: booker.email,
                name: booker.name,
              },
              status: BookingStatus.ACCEPTED,
              startTime: bookingStartTime.toISOString(),
              endTime: bookingStartTime.add(30, "minutes").toISOString(),
            },
          ],
          organizer,
        })
      );

      try {
        await handleCancelBooking({
          bookingData: {
            uid: bookingUid,
            cancellationReason: "Test cancellation",
          },
          userId: 103 + testCases.indexOf(testCase),
        });

        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).statusCode).toBe(403);
        expect((error as HttpError).message).toBe(testCase.expectedMessage);
      }
    }
  });

  test("Should allow cancellation when minimumCancellationNotice is 0", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 110,
      schedules: [TestData.schedules.IstWorkHours],
    });

    const bookingUid = "no-restriction-booking";
    const bookingId = 3000;

    // Create a booking that starts in 30 minutes
    const bookingStartTime = dayjs().add(30, "minutes");

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 200,
            slotInterval: 30,
            length: 30,
            minimumCancellationNotice: 0, // No restriction
            users: [
              {
                id: 110,
              },
            ],
          },
        ],
        bookings: [
          {
            id: bookingId,
            uid: bookingUid,
            eventTypeId: 200,
            userId: 110,
            responses: {
              email: booker.email,
              name: booker.name,
            },
            status: BookingStatus.ACCEPTED,
            startTime: bookingStartTime.toISOString(),
            endTime: bookingStartTime.add(30, "minutes").toISOString(),
          },
        ],
        organizer,
      })
    );

    // Should successfully cancel the booking even though it's only 30 minutes away
    const result = await handleCancelBooking({
      bookingData: {
        uid: bookingUid,
        cancellationReason: "Last minute change",
      },
      userId: 110,
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("Booking successfully cancelled.");
    expect(result.bookingUid).toBe(bookingUid);
  });

  test("Should allow cancellation when minimumCancellationNotice is undefined", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 111,
      schedules: [TestData.schedules.IstWorkHours],
    });

    const bookingUid = "undefined-restriction-booking";
    const bookingId = 3001;

    // Create a booking that starts in 15 minutes
    const bookingStartTime = dayjs().add(15, "minutes");

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 201,
            slotInterval: 30,
            length: 30,
            // minimumCancellationNotice is not set (undefined)
            users: [
              {
                id: 111,
              },
            ],
          },
        ],
        bookings: [
          {
            id: bookingId,
            uid: bookingUid,
            eventTypeId: 201,
            userId: 111,
            responses: {
              email: booker.email,
              name: booker.name,
            },
            status: BookingStatus.ACCEPTED,
            startTime: bookingStartTime.toISOString(),
            endTime: bookingStartTime.add(30, "minutes").toISOString(),
          },
        ],
        organizer,
      })
    );

    // Should successfully cancel the booking
    const result = await handleCancelBooking({
      bookingData: {
        uid: bookingUid,
        cancellationReason: "Urgent matter",
      },
      userId: 111,
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("Booking successfully cancelled.");
    expect(result.bookingUid).toBe(bookingUid);
  });

  test("Should calculate time difference correctly across time zones", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 112,
      schedules: [TestData.schedules.IstWorkHours],
      timeZone: "America/New_York",
    });

    const bookingUid = "timezone-booking";
    const bookingId = 3002;

    // Create a booking in UTC that starts in 2 hours
    const bookingStartTime = dayjs().utc().add(2, "hours");

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 202,
            slotInterval: 30,
            length: 30,
            minimumCancellationNotice: 180, // 3 hours
            users: [
              {
                id: 112,
              },
            ],
          },
        ],
        bookings: [
          {
            id: bookingId,
            uid: bookingUid,
            eventTypeId: 202,
            userId: 112,
            responses: {
              email: booker.email,
              name: booker.name,
            },
            status: BookingStatus.ACCEPTED,
            startTime: bookingStartTime.toISOString(),
            endTime: bookingStartTime.add(30, "minutes").toISOString(),
          },
        ],
        organizer,
      })
    );

    // Should block cancellation as it's within 3 hours
    try {
      await handleCancelBooking({
        bookingData: {
          uid: bookingUid,
          cancellationReason: "Timezone test",
        },
        userId: 112,
      });

      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(403);
      expect((error as HttpError).message).toContain("Cannot cancel within 3 hours of event start");
    }
  });

  test("Should check minimum notice for recurring event bookings", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 113,
      schedules: [TestData.schedules.IstWorkHours],
    });

    const recurringEventId = "recurring-series-123";
    const bookingUid = "recurring-booking-1";
    const bookingId = 3003;

    // Create a recurring booking where first instance is in 2 hours
    const bookingStartTime = dayjs().add(2, "hours");

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 203,
            slotInterval: 30,
            length: 30,
            minimumCancellationNotice: 1440, // 24 hours
            recurringEvent: {
              freq: 2, // Weekly
              count: 4,
              interval: 1,
            },
            users: [
              {
                id: 113,
              },
            ],
          },
        ],
        bookings: [
          {
            id: bookingId,
            uid: bookingUid,
            eventTypeId: 203,
            userId: 113,
            recurringEventId,
            responses: {
              email: booker.email,
              name: booker.name,
            },
            status: BookingStatus.ACCEPTED,
            startTime: bookingStartTime.toISOString(),
            endTime: bookingStartTime.add(30, "minutes").toISOString(),
          },
        ],
        organizer,
      })
    );

    // Should block cancellation of single instance within notice period
    try {
      await handleCancelBooking({
        bookingData: {
          uid: bookingUid,
          cancellationReason: "Cannot make this instance",
        },
        userId: 113,
      });

      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(403);
      expect((error as HttpError).message).toContain("Cannot cancel within 24 hours of event start");
    }
  });

  test("Should validate minimum notice for team event bookings", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Team Member",
      email: "team@example.com",
      id: 114,
      schedules: [TestData.schedules.IstWorkHours],
    });

    const bookingUid = "team-booking";
    const bookingId = 3004;

    // Create a team booking that starts in 30 minutes
    const bookingStartTime = dayjs().add(30, "minutes");

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 204,
            slotInterval: 30,
            length: 30,
            minimumCancellationNotice: 60, // 1 hour
            team: {
              id: 1,
              name: "Test Team",
            },
            users: [
              {
                id: 114,
              },
            ],
          },
        ],
        bookings: [
          {
            id: bookingId,
            uid: bookingUid,
            eventTypeId: 204,
            userId: 114,
            responses: {
              email: booker.email,
              name: booker.name,
            },
            status: BookingStatus.ACCEPTED,
            startTime: bookingStartTime.toISOString(),
            endTime: bookingStartTime.add(30, "minutes").toISOString(),
          },
        ],
        organizer,
      })
    );

    // Should block cancellation as it's within 1 hour
    try {
      await handleCancelBooking({
        bookingData: {
          uid: bookingUid,
          cancellationReason: "Team event cancellation",
        },
        userId: 114,
      });

      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(403);
      expect((error as HttpError).message).toContain("Cannot cancel within 1 hour of event start");
    }
  });

  test("Should handle edge case of booking exactly at minimum notice boundary", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 115,
      schedules: [TestData.schedules.IstWorkHours],
    });

    const bookingUid = "boundary-booking";
    const bookingId = 3005;

    // Create a booking that starts exactly 60 minutes from now
    // Add 1 second buffer to account for test execution time
    const bookingStartTime = dayjs().add(60, "minutes").add(1, "second");

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 205,
            slotInterval: 30,
            length: 30,
            minimumCancellationNotice: 60, // Exactly 1 hour
            users: [
              {
                id: 115,
              },
            ],
          },
        ],
        bookings: [
          {
            id: bookingId,
            uid: bookingUid,
            eventTypeId: 205,
            userId: 115,
            responses: {
              email: booker.email,
              name: booker.name,
            },
            status: BookingStatus.ACCEPTED,
            startTime: bookingStartTime.toISOString(),
            endTime: bookingStartTime.add(30, "minutes").toISOString(),
          },
        ],
        organizer,
      })
    );

    // Should allow cancellation as it's exactly at the boundary (not within)
    const result = await handleCancelBooking({
      bookingData: {
        uid: bookingUid,
        cancellationReason: "Boundary test",
      },
      userId: 115,
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("Booking successfully cancelled.");
    expect(result.bookingUid).toBe(bookingUid);
  });

  test("Should not affect already cancelled bookings", async () => {
    const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 116,
      schedules: [TestData.schedules.IstWorkHours],
    });

    const bookingUid = "already-cancelled";
    const bookingId = 3006;

    const bookingStartTime = dayjs().add(2, "hours");

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 206,
            slotInterval: 30,
            length: 30,
            minimumCancellationNotice: 1440,
            users: [
              {
                id: 116,
              },
            ],
          },
        ],
        bookings: [
          {
            id: bookingId,
            uid: bookingUid,
            eventTypeId: 206,
            userId: 116,
            responses: {
              email: booker.email,
              name: booker.name,
            },
            status: BookingStatus.CANCELLED, // Already cancelled
            startTime: bookingStartTime.toISOString(),
            endTime: bookingStartTime.add(30, "minutes").toISOString(),
          },
        ],
        organizer,
      })
    );

    // Should throw error for already cancelled booking
    try {
      await handleCancelBooking({
        bookingData: {
          uid: bookingUid,
          cancellationReason: "Trying to cancel again",
        },
        userId: 116,
      });

      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(400);
      expect((error as HttpError).message).toBe("This booking has already been cancelled.");
    }
  });
});
