import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import * as constants from "@calcom/lib/constants";
import { BookingStatus } from "@calcom/prisma/client";

import { determineReschedulePreventionRedirect, type RescheduleValidationInput } from "./getServerSideProps";

// Mock the constants module
vi.mock("@calcom/lib/constants", async () => {
  const actual = (await vi.importActual("@calcom/lib/constants")) as typeof import("@calcom/lib/constants");
  return {
    ...actual,
    ENV_PAST_BOOKING_RESCHEDULE_CHANGE: undefined, // Default to undefined, will be overridden in tests
  };
});

const createTestBooking = (overrides?: {
  uid?: string;
  status?: BookingStatus;
  endTime?: Date | null;
  eventType?: {
    disableRescheduling?: boolean | null;
    allowReschedulingPastBookings?: boolean | null;
    allowReschedulingCancelledBookings?: boolean | null;
    teamId?: number | null;
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
          teamId: null,
        },
  dynamicEventSlugRef: overrides?.dynamicEventSlugRef !== undefined ? overrides.dynamicEventSlugRef : null,
});

// Removed createTestEventType as eventType is no longer a separate parameter

const createRescheduleValidationInput = (overrides?: {
  booking?: ReturnType<typeof createTestBooking>;
  eventUrl?: string;
  allowRescheduleForCancelledBooking?: boolean;
}): RescheduleValidationInput => ({
  booking: overrides?.booking || createTestBooking(),
  eventUrl: overrides?.eventUrl || "https://example.com/event",
  allowRescheduleForCancelledBooking: overrides?.allowRescheduleForCancelledBooking || false,
});

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const _hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);
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

const expectRedirectToEventBookingPage = (result: any, eventUrl: string) => {
  expect(result).toEqual({
    redirect: {
      destination: expect.stringMatching(
        new RegExp(`^${eventUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\?.*)?$`)
      ),
      permanent: false,
    },
  });
};

const expectNotFound = (result: any) => {
  expect(result).toEqual({
    notFound: true,
  });
};

const expectNoRedirect = (result: any) => {
  expect(result).toBeNull();
};

describe("determineReschedulePreventionRedirect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:00:00Z"));
    // Reset mocked constant to default before each test
    vi.mocked(constants).ENV_PAST_BOOKING_RESCHEDULE_CHANGE = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
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
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineReschedulePreventionRedirect(input);

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
      const result = determineReschedulePreventionRedirect(input);

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
      const result = determineReschedulePreventionRedirect(input);

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
      const result = determineReschedulePreventionRedirect(input);

      expectNoRedirect(result);
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
      const result = determineReschedulePreventionRedirect(input);

      expectRedirectToBookingPage(result, testData.booking.uid);
    });
  });

  describe("when booking is in the past - Default behaviour", () => {
    it("should redirect to event booking URL with params when allowReschedulingPastBookings is false", () => {
      const testData = {
        booking: createTestBooking({
          endTime: daysAgo(5),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false,
            allowReschedulingCancelledBookings: false,
            teamId: null,
          },
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineReschedulePreventionRedirect(input);

      // Should redirect to eventUrl with name/email params (original main behavior)
      expectRedirectToEventBookingPage(result, "https://example.com/event");
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
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineReschedulePreventionRedirect(input);

      expectNoRedirect(result);
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
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineReschedulePreventionRedirect(input);

      expectNoRedirect(result);
    });
  });

  describe("when booking is in the past - New behaviour(based on ENV_PAST_BOOKING_RESCHEDULE_CHANGE)", () => {
    it("should redirect to booking status page when team is configured for redirect behavior", () => {
      vi.mocked(constants).ENV_PAST_BOOKING_RESCHEDULE_CHANGE = "123,456,789";

      const testData = {
        booking: createTestBooking({
          uid: "team-booking-uid",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(3),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false,
            allowReschedulingCancelledBookings: false,
            teamId: 456, // This team ID is in the environment variable
          },
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineReschedulePreventionRedirect(input);

      expectRedirectToBookingPage(result, testData.booking.uid);
    });

    it("should redirect to event URL when team is not configured for redirect behavior", () => {
      vi.mocked(constants).ENV_PAST_BOOKING_RESCHEDULE_CHANGE = "123,456,789";

      const testData = {
        booking: createTestBooking({
          uid: "non-team-booking-uid",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(3),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false,
            allowReschedulingCancelledBookings: false,
            teamId: 999, // This team ID is NOT in the environment variable
          },
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineReschedulePreventionRedirect(input);

      // Should redirect to eventUrl with name/email params (fallback behavior)
      expect(result).toEqual({
        redirect: {
          destination: expect.stringMatching(/^https:\/\/example\.com\/event(\?.*)?$/),
          permanent: false,
        },
      });
    });

    it("should redirect to event URL when booking has no team (individual event)", () => {
      vi.mocked(constants).ENV_PAST_BOOKING_RESCHEDULE_CHANGE = "123,456,789";

      const testData = {
        booking: createTestBooking({
          uid: "no-team-booking-uid",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(3),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false,
            allowReschedulingCancelledBookings: false,
            teamId: null, // No team ID
          },
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineReschedulePreventionRedirect(input);

      // Should redirect to eventUrl with name/email params (fallback behavior)
      expect(result).toEqual({
        redirect: {
          destination: expect.stringMatching(/^https:\/\/example\.com\/event(\?.*)?$/),
          permanent: false,
        },
      });
    });

    it("should redirect to event URL when no teams are configured for redirect behavior", () => {
      const testData = {
        booking: createTestBooking({
          uid: "any-team-booking-uid",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(3),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false,
            allowReschedulingCancelledBookings: false,
            teamId: 456, // Any team ID
          },
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineReschedulePreventionRedirect(input);

      // Should redirect to eventUrl with name/email params (fallback behavior)
      expect(result).toEqual({
        redirect: {
          destination: expect.stringMatching(/^https:\/\/example\.com\/event(\?.*)?$/),
          permanent: false,
        },
      });
    });

    it("should redirect to event URL when environment variable is empty", () => {
      vi.mocked(constants).ENV_PAST_BOOKING_RESCHEDULE_CHANGE = "";

      const testData = {
        booking: createTestBooking({
          uid: "empty-env-booking-uid",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(3),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false,
            allowReschedulingCancelledBookings: false,
            teamId: 456,
          },
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineReschedulePreventionRedirect(input);

      // Should redirect to eventUrl with name/email params (fallback behavior)
      expect(result).toEqual({
        redirect: {
          destination: expect.stringMatching(/^https:\/\/example\.com\/event(\?.*)?$/),
          permanent: false,
        },
      });
    });

    it("should redirect to booking status page despite invalid values when team ID matches valid entry", () => {
      vi.mocked(constants).ENV_PAST_BOOKING_RESCHEDULE_CHANGE = " 123 , , invalid , 456 ,  789  ";

      const testData = {
        booking: createTestBooking({
          uid: "whitespace-env-booking-uid",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(3),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false,
            allowReschedulingCancelledBookings: false,
            teamId: 456, // Valid team ID that should be found despite whitespace
          },
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineReschedulePreventionRedirect(input);

      expectRedirectToBookingPage(result, testData.booking.uid);
    });

    it("should allow new booking creation when past bookings are explicitly allowed regardless of team configuration", () => {
      vi.mocked(constants).ENV_PAST_BOOKING_RESCHEDULE_CHANGE = "123,456,789";

      const testData = {
        booking: createTestBooking({
          uid: "allowed-past-reschedule-uid",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(3),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: true, // Past reschedule explicitly allowed
            allowReschedulingCancelledBookings: false,
            teamId: 456, // Team ID is in environment variable
          },
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineReschedulePreventionRedirect(input);

      expectNoRedirect(result);
    });

    it("should redirect to booking status page for configured fake team IDs", () => {
      vi.mocked(constants).ENV_PAST_BOOKING_RESCHEDULE_CHANGE = "11001,22002,33003";

      const testData = {
        booking: createTestBooking({
          uid: "fake-team-booking-uid",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(2),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false,
            allowReschedulingCancelledBookings: false,
            teamId: 22002, // Fake team ID that matches env var
          },
        }),
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineReschedulePreventionRedirect(input);

      expectRedirectToBookingPage(result, testData.booking.uid);
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
      const result = determineReschedulePreventionRedirect(input);

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
      const result = determineReschedulePreventionRedirect(input);

      expectNoRedirect(result);
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
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineReschedulePreventionRedirect(input);

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
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineReschedulePreventionRedirect(input);

      expectNoRedirect(result);
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
      const result = determineReschedulePreventionRedirect(input);

      expectNoRedirect(result);
    });
  });

  describe("past booking user experience verification", () => {
    it("should show booking status instead of allowing new booking for configured teams", () => {
      vi.mocked(constants).ENV_PAST_BOOKING_RESCHEDULE_CHANGE = "12345,67890";

      const testData = {
        booking: createTestBooking({
          uid: "test-past-booking-uid",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(7), // Past booking
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false, // Past bookings not allowed
            allowReschedulingCancelledBookings: false,
            teamId: 12345, // Team ID is in environment variable
          },
        }),
        eventUrl: "https://example.cal.com/team/event-type/connect",
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineReschedulePreventionRedirect(input);

      expectRedirectToBookingPage(result, testData.booking.uid);

      // Verify it does NOT redirect to event URL (old buggy behavior)
      expect(result).not.toEqual({
        redirect: {
          destination: expect.stringContaining("example.cal.com"),
          permanent: false,
        },
      });
    });

    it("should show clean booking status without pre-filled booking data for configured teams", () => {
      vi.mocked(constants).ENV_PAST_BOOKING_RESCHEDULE_CHANGE = "54321";

      const testData = {
        booking: createTestBooking({
          uid: "test-past-booking-uid",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(5),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false,
            allowReschedulingCancelledBookings: false,
            teamId: 54321, // Team ID is in environment variable
          },
        }),
        eventUrl: "https://example.cal.com/team/event-type/connect",
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineReschedulePreventionRedirect(input);

      // FIXED: No longer redirects to eventUrl with query params
      // Old behavior would have been:

      expect(result).not.toEqual({
        redirect: {
          destination: expect.stringContaining("?name="),
          permanent: false,
        },
      });

      // Now correctly redirects to booking page
      expectRedirectToBookingPage(result, testData.booking.uid);
    });

    it("should handle the exact bug report scenario correctly when team is configured", () => {
      // This test replicates the exact scenario described in the bug report:
      // - OLD BUG: took user to booking page with pre-filled data
      // - FIXED: now redirects to booking page showing booking status

      vi.mocked(constants).ENV_PAST_BOOKING_RESCHEDULE_CHANGE = "98765";

      const testData = {
        booking: createTestBooking({
          uid: "test-past-booking-uid",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(10), // Booking was in the past
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false, // Allow rescheduling past events is disabled
            allowReschedulingCancelledBookings: false, // Allow booking through reschedule link is also disabled
            teamId: 98765, // Team ID is in environment variable
          },
        }),
        eventUrl: "https://example.cal.com/team/event-type/connect",
        allowRescheduleForCancelledBooking: false,
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineReschedulePreventionRedirect(input);

      // FIXED: Now redirects to booking page showing that booking is in past
      expectRedirectToBookingPage(result, "test-past-booking-uid");

      // Verify it does NOT redirect to event URL (old buggy behavior)
      expect(result).not.toEqual({
        redirect: {
          destination: expect.stringContaining("example.cal.com/team/event-type/connect"),
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
      };

      const input = createRescheduleValidationInput(testData);
      const result = determineReschedulePreventionRedirect(input);

      // Cancelled bookings should redirect to booking page (this should continue to work)
      expectRedirectToBookingPage(result, "cancelled-booking-uid");
    });

    it("should demonstrate old vs new behavior with detailed assertions when team is configured", () => {
      vi.mocked(constants).ENV_PAST_BOOKING_RESCHEDULE_CHANGE = "13579";

      const pastBookingData = {
        booking: createTestBooking({
          uid: "past-booking-test",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(3),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false,
            allowReschedulingCancelledBookings: false,
            teamId: 13579, // Team ID is in environment variable
          },
        }),
        eventUrl: "https://example.com/event-type",
      };

      const input = createRescheduleValidationInput(pastBookingData);
      const result = determineReschedulePreventionRedirect(input);

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
