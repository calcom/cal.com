import { describe, expect, vi, beforeEach, afterEach, test } from "vitest";
import dayjs from "@calcom/dayjs";
import { BookingStatus } from "@calcom/prisma/enums";
import { HttpError } from "@calcom/lib/http-error";
import { TRPCError } from "@trpc/server";
import {
  createBookingScenario,
  getBooker,
  getOrganizer,
  getScenarioData,
  TestData,
  mockCalendarToHaveNoBusySlots,
  mockSuccessfulVideoMeetingCreation,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

vi.mock("@calcom/lib/payment/processPaymentRefund", () => ({
  processPaymentRefund: vi.fn(),
}));

vi.mock("@calcom/emails", () => ({
  sendCancelledEmailsAndSMS: vi.fn().mockResolvedValue(true),
  sendRequestRescheduleEmailAndSMS: vi.fn().mockResolvedValue(true),
}));

describe("Minimum Cancellation/Reschedule Notice - Integration Tests", () => {
  setupAndTeardown();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Complete Flow - Cancellation and Reschedule", () => {
    test("Should enforce minimum notice for both cancellation and reschedule", async () => {
      const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking"))
        .default;
      const { requestRescheduleHandler } = await import(
        "@calcom/trpc/server/routers/viewer/bookings/requestReschedule.handler"
      );

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 201,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const bookingUid = "integrated-booking";
      const bookingId = 7000;

      // Create a booking that starts in 2 hours
      const bookingStartTime = dayjs().add(2, "hours");

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 600,
              slotInterval: 30,
              length: 30,
              minimumCancellationNotice: 180, // 3 hours in minutes
              users: [
                {
                  id: 201,
                },
              ],
            },
          ],
          bookings: [
            {
              id: bookingId,
              uid: bookingUid,
              eventTypeId: 600,
              userId: 201,
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

      // Test cancellation - should be blocked
      try {
        await handleCancelBooking({
          bookingData: {
            uid: bookingUid,
            cancellationReason: "Cannot make it",
          },
          userId: 201,
        });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).statusCode).toBe(403);
        expect((error as HttpError).message).toContain("Cannot cancel within 3 hours of event start");
      }

      // Test reschedule - should also be blocked
      try {
        await requestRescheduleHandler({
          ctx: {
            user: {
              id: 201,
              username: organizer.username,
              email: organizer.email,
            } as any,
          },
          input: {
            bookingId: bookingUid,
            rescheduleReason: "Need to reschedule",
          },
        });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("FORBIDDEN");
        expect((error as TRPCError).message).toContain("Cannot reschedule within 3 hours of event start");
      }
    });

    test("Should allow operations outside minimum notice period", async () => {
      const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking"))
        .default;
      const { requestRescheduleHandler } = await import(
        "@calcom/trpc/server/routers/viewer/bookings/requestReschedule.handler"
      );

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 202,
        schedules: [TestData.schedules.IstWorkHours],
      });

      // Create two bookings - one for cancel, one for reschedule
      const cancelBookingUid = "cancel-allowed";
      const rescheduleBookingUid = "reschedule-allowed";
      const cancelBookingId = 7001;
      const rescheduleBookingId = 7002;

      // Both bookings start in 4 hours (outside 3-hour minimum notice)
      const bookingStartTime = dayjs().add(4, "hours");

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 601,
              slotInterval: 30,
              length: 30,
              minimumCancellationNotice: 180, // 3 hours in minutes
              users: [
                {
                  id: 202,
                },
              ],
            },
          ],
          bookings: [
            {
              id: cancelBookingId,
              uid: cancelBookingUid,
              eventTypeId: 601,
              userId: 202,
              responses: {
                email: booker.email,
                name: booker.name,
              },
              status: BookingStatus.ACCEPTED,
              startTime: bookingStartTime.toISOString(),
              endTime: bookingStartTime.add(30, "minutes").toISOString(),
            },
            {
              id: rescheduleBookingId,
              uid: rescheduleBookingUid,
              eventTypeId: 601,
              userId: 202,
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

      // Test cancellation - should succeed
      const cancelResult = await handleCancelBooking({
        bookingData: {
          uid: cancelBookingUid,
          cancellationReason: "Change of plans",
        },
        userId: 202,
      });

      expect(cancelResult.success).toBe(true);
      expect(cancelResult.message).toBe("Booking successfully cancelled.");
      expect(cancelResult.bookingUid).toBe(cancelBookingUid);

      // Test reschedule - should succeed
      const rescheduleResult = await requestRescheduleHandler({
        ctx: {
          user: {
            id: 202,
            username: organizer.username,
            email: organizer.email,
          } as any,
        },
        input: {
          bookingId: rescheduleBookingUid,
          rescheduleReason: "Schedule conflict",
        },
      });

      expect(rescheduleResult).toBeDefined();
    });
  });

  describe("Edge Cases and Special Scenarios", () => {
    test("Should handle different minimum notice values consistently", async () => {
      const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking"))
        .default;
      const { requestRescheduleHandler } = await import(
        "@calcom/trpc/server/routers/viewer/bookings/requestReschedule.handler"
      );

      const testScenarios = [
        {
          minimumNotice: 0,
          bookingHoursAway: 0.5,
          shouldBlock: false,
          description: "No restriction",
        },
        {
          minimumNotice: 60,
          bookingHoursAway: 0.5,
          shouldBlock: true,
          description: "1 hour restriction, booking in 30 minutes",
        },
        {
          minimumNotice: 60,
          bookingHoursAway: 1.5,
          shouldBlock: false,
          description: "1 hour restriction, booking in 90 minutes",
        },
        {
          minimumNotice: 1440,
          bookingHoursAway: 12,
          shouldBlock: true,
          description: "24 hour restriction, booking in 12 hours",
        },
        {
          minimumNotice: 1440,
          bookingHoursAway: 25,
          shouldBlock: false,
          description: "24 hour restriction, booking in 25 hours",
        },
      ];

      for (const scenario of testScenarios) {
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizerId = 300 + testScenarios.indexOf(scenario);
        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: organizerId,
          schedules: [TestData.schedules.IstWorkHours],
        });

        const bookingUid = `scenario-${testScenarios.indexOf(scenario)}`;
        const bookingId = 8000 + testScenarios.indexOf(scenario);
        const eventTypeId = 700 + testScenarios.indexOf(scenario);

        const bookingStartTime = dayjs().add(scenario.bookingHoursAway, "hours");

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: eventTypeId,
                slotInterval: 30,
                length: 30,
                minimumCancellationNotice: scenario.minimumNotice,
                users: [
                  {
                    id: organizerId,
                  },
                ],
              },
            ],
            bookings: [
              {
                id: bookingId,
                uid: bookingUid,
                eventTypeId: eventTypeId,
                userId: organizerId,
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

        if (scenario.shouldBlock) {
          // Should block both cancel and reschedule
          await expect(
            handleCancelBooking({
              bookingData: {
                uid: bookingUid,
                cancellationReason: scenario.description,
              },
              userId: organizerId,
            })
          ).rejects.toThrow(HttpError);

          await expect(
            requestRescheduleHandler({
              ctx: {
                user: {
                  id: organizerId,
                  username: organizer.username,
                  email: organizer.email,
                } as any,
              },
              input: {
                bookingId: bookingUid,
                rescheduleReason: scenario.description,
              },
            })
          ).rejects.toThrow(TRPCError);
        } else {
          // Should allow both cancel and reschedule
          const cancelResult = await handleCancelBooking({
            bookingData: {
              uid: bookingUid,
              cancellationReason: scenario.description,
            },
            userId: organizerId,
          });

          expect(cancelResult.success).toBe(true);

          // Create a new booking for reschedule test since the previous one was cancelled
          const rescheduleBookingUid = `${bookingUid}-reschedule`;
          const rescheduleBookingId = bookingId + 1000;

          await createBookingScenario(
            getScenarioData({
              eventTypes: [
                {
                  id: eventTypeId,
                  slotInterval: 30,
                  length: 30,
                  minimumCancellationNotice: scenario.minimumNotice,
                  users: [
                    {
                      id: organizerId,
                    },
                  ],
                },
              ],
              bookings: [
                {
                  id: rescheduleBookingId,
                  uid: rescheduleBookingUid,
                  eventTypeId: eventTypeId,
                  userId: organizerId,
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

          const rescheduleResult = await requestRescheduleHandler({
            ctx: {
              user: {
                id: organizerId,
                username: organizer.username,
                email: organizer.email,
              } as any,
            },
            input: {
              bookingId: rescheduleBookingUid,
              rescheduleReason: scenario.description,
            },
          });

          expect(rescheduleResult).toBeDefined();
        }
      }
    });

    test("Should handle past bookings correctly", async () => {
      const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking"))
        .default;

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 400,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const bookingUid = "past-booking";
      const bookingId = 9000;

      // Create a booking that already happened (1 hour ago)
      const bookingStartTime = dayjs().subtract(1, "hour");

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 800,
              slotInterval: 30,
              length: 30,
              minimumCancellationNotice: 60,
              users: [
                {
                  id: 400,
                },
              ],
            },
          ],
          bookings: [
            {
              id: bookingId,
              uid: bookingUid,
              eventTypeId: 800,
              userId: 400,
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

      // Should block cancellation of past booking
      try {
        await handleCancelBooking({
          bookingData: {
            uid: bookingUid,
            cancellationReason: "Trying to cancel past booking",
          },
          userId: 400,
        });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        // The error message will indicate the booking is in the past
        expect((error as HttpError).statusCode).toBe(403);
      }
    });

    test("Should validate minimum notice across different time zones", async () => {
      const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking"))
        .default;

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
        timeZone: "America/Los_Angeles",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 401,
        schedules: [TestData.schedules.IstWorkHours],
        timeZone: "Asia/Tokyo",
      });

      const bookingUid = "timezone-test";
      const bookingId = 9001;

      // Create a booking that's 2 hours away in UTC
      const bookingStartTime = dayjs().utc().add(2, "hours");

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 801,
              slotInterval: 30,
              length: 30,
              minimumCancellationNotice: 180, // 3 hours
              users: [
                {
                  id: 401,
                },
              ],
            },
          ],
          bookings: [
            {
              id: bookingId,
              uid: bookingUid,
              eventTypeId: 801,
              userId: 401,
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

      // Should block cancellation regardless of time zone
      try {
        await handleCancelBooking({
          bookingData: {
            uid: bookingUid,
            cancellationReason: "Timezone test",
          },
          userId: 401,
        });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).statusCode).toBe(403);
        expect((error as HttpError).message).toContain("Cannot cancel within 3 hours of event start");
      }
    });
  });

  describe("Performance and Stress Tests", () => {
    test("Should handle multiple concurrent cancellation attempts efficiently", async () => {
      const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking"))
        .default;

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 500,
        schedules: [TestData.schedules.IstWorkHours],
      });

      // Create multiple bookings
      const bookings = [];
      for (let i = 0; i < 5; i++) {
        const hoursAway = i < 3 ? 1 : 5; // First 3 within notice, last 2 outside
        bookings.push({
          id: 10000 + i,
          uid: `concurrent-${i}`,
          eventTypeId: 900,
          userId: 500,
          responses: {
            email: booker.email,
            name: booker.name,
          },
          status: BookingStatus.ACCEPTED,
          startTime: dayjs().add(hoursAway, "hours").toISOString(),
          endTime: dayjs().add(hoursAway, "hours").add(30, "minutes").toISOString(),
        });
      }

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 900,
              slotInterval: 30,
              length: 30,
              minimumCancellationNotice: 120, // 2 hours
              users: [
                {
                  id: 500,
                },
              ],
            },
          ],
          bookings,
          organizer,
        })
      );

      // Attempt to cancel all bookings concurrently
      const cancellationPromises = bookings.map((booking, index) =>
        handleCancelBooking({
          bookingData: {
            uid: booking.uid,
            cancellationReason: `Concurrent test ${index}`,
          },
          userId: 500,
        }).catch((error) => ({ error, uid: booking.uid }))
      );

      const results = await Promise.all(cancellationPromises);

      // First 3 should fail (within 2-hour notice)
      for (let i = 0; i < 3; i++) {
        const result = results[i] as { error: HttpError; uid: string };
        expect(result.error).toBeInstanceOf(HttpError);
        expect(result.error.statusCode).toBe(403);
      }

      // Last 2 should succeed (outside 2-hour notice)
      for (let i = 3; i < 5; i++) {
        const result = results[i] as any;
        expect(result.success).toBe(true);
        expect(result.message).toBe("Booking successfully cancelled.");
      }
    });
  });
});