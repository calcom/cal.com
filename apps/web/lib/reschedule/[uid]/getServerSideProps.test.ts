import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { BookingStatus } from "@calcom/prisma/client";

import { determineRescheduleRedirect, type RescheduleValidationInput } from "./getServerSideProps";

const createTestBooking = (overrides?: {
  uid?: string;
  status?: BookingStatus;
  endTime?: Date | null;
  eventType?: {
    disableRescheduling?: boolean | null;
    allowReschedulingPastBookings?: boolean | null;
    allowReschedulingCancelledBookings?: boolean | null;
  } | null;
  dynamicEventSlugRef?: string | null;
}) => ({
  uid: overrides?.uid || "test-booking-uid",
  status: overrides?.status || BookingStatus.ACCEPTED,
  endTime: overrides?.endTime !== undefined ? overrides.endTime : futureDate(5),
  eventType:
    overrides?.eventType !== undefined
      ? overrides.eventType
      : {
          disableRescheduling: false,
          allowReschedulingPastBookings: true,
          allowReschedulingCancelledBookings: false,
        },
  dynamicEventSlugRef: overrides?.dynamicEventSlugRef !== undefined ? overrides.dynamicEventSlugRef : null,
});

const createTestEventType = (overrides?: { allowReschedulingPastBookings?: boolean | null }) => ({
  allowReschedulingPastBookings:
    overrides?.allowReschedulingPastBookings !== undefined ? overrides.allowReschedulingPastBookings : true,
});

const createRescheduleValidationInput = (overrides?: {
  booking?: ReturnType<typeof createTestBooking>;
  eventType?: ReturnType<typeof createTestEventType>;
  eventUrl?: string;
  allowRescheduleForCancelledBooking?: boolean;
}): RescheduleValidationInput => ({
  booking: overrides?.booking || createTestBooking(),
  eventType: overrides?.eventType || createTestEventType(),
  eventUrl: overrides?.eventUrl || "https://example.com/event",
  allowRescheduleForCancelledBooking: overrides?.allowRescheduleForCancelledBooking || false,
});

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);
const futureDate = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const expectRedirectToBookingPage = (result: any, bookingUid: string) => {
  expect(result).toEqual({
    redirect: {
      destination: `/booking/${bookingUid}`,
      permanent: false,
    },
  });
};

const expectRedirectToEventUrl = (result: any, eventUrl: string) => {
  expect(result).toEqual({
    redirect: {
      destination: eventUrl,
      permanent: false,
    },
  });
};

const expectNotFound = (result: any) => {
  expect(result).toEqual({
    notFound: true,
  });
};

const expectRescheduleAllowed = (result: any) => {
  expect(result).toBeNull();
};

describe("determineRescheduleRedirect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("when rescheduling is disabled", () => {
    it("should redirect to booking page", () => {
      const testData = {
        booking: createTestBooking({
          eventType: {
            disableRescheduling: true,
            allowReschedulingPastBookings: true,
            allowReschedulingCancelledBookings: false,
          },
        }),
        eventType: createTestEventType(),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineRescheduleRedirect(input);

      expectRedirectToBookingPage(result, testData.booking.uid);
    });
  });

  describe("when booking is cancelled", () => {
    it("should redirect to booking page when allowReschedulingCancelledBookings is false", () => {
      const testData = {
        booking: createTestBooking({
          status: BookingStatus.CANCELLED,
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: true,
            allowReschedulingCancelledBookings: false,
          },
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineRescheduleRedirect(input);

      expectRedirectToBookingPage(result, testData.booking.uid);
    });

    it("should redirect to event URL when allowReschedulingCancelledBookings is true", () => {
      const testData = {
        booking: createTestBooking({
          status: BookingStatus.CANCELLED,
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: true,
            allowReschedulingCancelledBookings: true,
          },
        }),
        eventUrl: "https://example.com/event",
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineRescheduleRedirect(input);

      expectRedirectToEventUrl(result, testData.eventUrl);
    });

    it("should allow reschedule when forced reschedule is enabled", () => {
      const testData = {
        booking: createTestBooking({
          status: BookingStatus.CANCELLED,
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: true,
            allowReschedulingCancelledBookings: false,
          },
        }),
        allowRescheduleForCancelledBooking: true,
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineRescheduleRedirect(input);

      expectRescheduleAllowed(result);
    });
  });

  describe("when booking is rejected", () => {
    it("should redirect to booking page", () => {
      const testData = {
        booking: createTestBooking({
          status: BookingStatus.REJECTED,
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineRescheduleRedirect(input);

      expectRedirectToBookingPage(result, testData.booking.uid);
    });
  });

  describe("when booking is in the past", () => {
    it("should redirect to booking page when allowReschedulingPastBookings is false", () => {
      const testData = {
        booking: createTestBooking({
          endTime: daysAgo(5),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false,
            allowReschedulingCancelledBookings: false,
          },
        }),
        eventType: createTestEventType({
          allowReschedulingPastBookings: false,
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineRescheduleRedirect(input);

      expectRedirectToBookingPage(result, testData.booking.uid);
    });

    it("should allow reschedule when allowReschedulingPastBookings is true", () => {
      const testData = {
        booking: createTestBooking({
          endTime: daysAgo(5),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: true,
            allowReschedulingCancelledBookings: false,
          },
        }),
        eventType: createTestEventType({
          allowReschedulingPastBookings: true,
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineRescheduleRedirect(input);

      expectRescheduleAllowed(result);
    });

    it("should treat null endTime as not in past", () => {
      const testData = {
        booking: createTestBooking({
          endTime: null,
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false,
            allowReschedulingCancelledBookings: false,
          },
        }),
        eventType: createTestEventType({
          allowReschedulingPastBookings: false,
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineRescheduleRedirect(input);

      expectRescheduleAllowed(result);
    });
  });

  describe("when booking is dynamic event", () => {
    it("should return notFound when no eventType and no dynamicEventSlugRef", () => {
      const testData = {
        booking: createTestBooking({
          eventType: null,
          dynamicEventSlugRef: null,
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineRescheduleRedirect(input);

      expectNotFound(result);
    });

    it("should allow reschedule when dynamicEventSlugRef exists", () => {
      const testData = {
        booking: createTestBooking({
          eventType: null,
          dynamicEventSlugRef: "dynamic-event",
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineRescheduleRedirect(input);

      expectRescheduleAllowed(result);
    });
  });

  describe("edge cases", () => {
    it("should prioritize cancelled status over past booking status", () => {
      const testData = {
        booking: createTestBooking({
          status: BookingStatus.CANCELLED,
          endTime: daysAgo(5),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false,
            allowReschedulingCancelledBookings: false,
          },
        }),
        eventType: createTestEventType({
          allowReschedulingPastBookings: false,
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineRescheduleRedirect(input);

      expectRedirectToBookingPage(result, testData.booking.uid);
    });

    it("should handle null eventType properties gracefully", () => {
      const testData = {
        booking: createTestBooking({
          eventType: {
            disableRescheduling: null,
            allowReschedulingPastBookings: null,
            allowReschedulingCancelledBookings: null,
          },
        }),
        eventType: createTestEventType({
          allowReschedulingPastBookings: null,
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineRescheduleRedirect(input);

      expectRescheduleAllowed(result);
    });

    it("should allow reschedule for normal accepted future booking", () => {
      const testData = {
        booking: createTestBooking({
          status: BookingStatus.ACCEPTED,
          endTime: futureDate(5),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: true,
            allowReschedulingCancelledBookings: false,
          },
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineRescheduleRedirect(input);

      expectRescheduleAllowed(result);
    });
  });

  describe("past booking bug fix verification", () => {
    it("should redirect past booking to booking page instead of event URL with pre-filled data", () => {
      const testData = {
        booking: createTestBooking({
          uid: "8VFjawv78269R5GHFqJVKh",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(7), // Past booking
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false, // Past bookings not allowed
            allowReschedulingCancelledBookings: false,
          },
        }),
        eventType: createTestEventType({
          allowReschedulingPastBookings: false,
        }),
        eventUrl: "https://trypennie.cal.com/team/loan-consult/connect",
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineRescheduleRedirect(input);

      // FIXED: Now correctly redirects to booking page instead of event URL
      expectRedirectToBookingPage(result, testData.booking.uid);

      // Verify it does NOT redirect to event URL (old buggy behavior)
      expect(result).not.toEqual({
        redirect: {
          destination: expect.stringContaining("trypennie.cal.com"),
          permanent: false,
        },
      });
    });

    it("should not preserve query parameters for past booking redirects", () => {
      const testData = {
        booking: createTestBooking({
          uid: "8VFjawv78269R5GHFqJVKh",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(5),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false,
            allowReschedulingCancelledBookings: false,
          },
        }),
        eventType: createTestEventType({
          allowReschedulingPastBookings: false,
        }),
        eventUrl: "https://trypennie.cal.com/team/loan-consult/connect",
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineRescheduleRedirect(input);

      // FIXED: No longer redirects to eventUrl with query params
      // Old behavior would have been:
      // "https://trypennie.cal.com/team/loan-consult/connect?name=Steve+Fitzgerald&email=sfitzgerald%40usaloancenter.com"

      expect(result).not.toEqual({
        redirect: {
          destination: expect.stringContaining("?name="),
          permanent: false,
        },
      });

      // Now correctly redirects to booking page
      expectRedirectToBookingPage(result, testData.booking.uid);
    });

    it("should handle the exact bug report scenario correctly", () => {
      // This test replicates the exact scenario described in the bug report:
      // - Booking ID: 8VFjawv78269R5GHFqJVKh was in past
      // - User tried to reschedule via /reschedule/8VFjawv78269R5GHFqJVKh?rescheduledBy=sfitzgerald%40usaloancenter.com
      // - OLD BUG: took user to booking page with pre-filled data
      // - FIXED: now redirects to booking page showing booking status

      const testData = {
        booking: createTestBooking({
          uid: "8VFjawv78269R5GHFqJVKh",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(10), // Booking was in the past
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false, // Allow rescheduling past events is disabled
            allowReschedulingCancelledBookings: false, // Allow booking through reschedule link is also disabled
          },
        }),
        eventType: createTestEventType({
          allowReschedulingPastBookings: false,
        }),
        eventUrl: "https://trypennie.cal.com/team/loan-consult/connect",
        allowRescheduleForCancelledBooking: false,
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineRescheduleRedirect(input);

      // FIXED: Now redirects to booking page showing that booking is in past
      expectRedirectToBookingPage(result, "8VFjawv78269R5GHFqJVKh");

      // Verify it does NOT redirect to event URL (old buggy behavior)
      expect(result).not.toEqual({
        redirect: {
          destination: expect.stringContaining("trypennie.cal.com/team/loan-consult/connect"),
          permanent: false,
        },
      });
    });

    it("should maintain cancelled booking behavior (regression test)", () => {
      // This test ensures that the cancelled booking fix from PR #21652 still works
      // and that our past booking fix doesn't break it

      const testData = {
        booking: createTestBooking({
          uid: "cancelled-booking-uid",
          status: BookingStatus.CANCELLED,
          endTime: futureDate(5), // Future booking that was cancelled
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: true,
            allowReschedulingCancelledBookings: false, // Cancelled reschedule not allowed
          },
        }),
        eventType: createTestEventType({
          allowReschedulingPastBookings: true,
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineRescheduleRedirect(input);

      // Cancelled bookings should redirect to booking page (this should continue to work)
      expectRedirectToBookingPage(result, "cancelled-booking-uid");
    });

    it("should demonstrate old vs new behavior with detailed assertions", () => {
      const pastBookingData = {
        booking: createTestBooking({
          uid: "past-booking-test",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(3),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false,
            allowReschedulingCancelledBookings: false,
          },
        }),
        eventType: createTestEventType({
          allowReschedulingPastBookings: false,
        }),
        eventUrl: "https://example.com/event-type",
      };

      const input = createRescheduleValidationInput(pastBookingData);
      const result = determineRescheduleRedirect(input);

      // NEW BEHAVIOR (FIXED): Redirects to booking page
      expect(result).toEqual({
        redirect: {
          destination: "/booking/past-booking-test",
          permanent: false,
        },
      });

      // OLD BEHAVIOR (BUGGY): Would have redirected to event URL with query params
      // This is what we DON'T want anymore:
      expect(result).not.toEqual({
        redirect: {
          destination: expect.stringContaining("https://example.com/event-type?"),
          permanent: false,
        },
      });

      // Verify the redirect destination is clean (no query params)
      expect(result).toHaveProperty("redirect");
      if (result && "redirect" in result) {
        expect(result.redirect.destination).not.toContain("?");
        expect(result.redirect.destination).not.toContain("name=");
        expect(result.redirect.destination).not.toContain("email=");
      }
    });
  });
});
