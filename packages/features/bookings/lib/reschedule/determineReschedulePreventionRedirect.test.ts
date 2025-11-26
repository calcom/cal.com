import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import * as constants from "@calcom/lib/constants";
import { BookingStatus } from "@calcom/prisma/client";
import type { JsonValue } from "@calcom/types/Json";

import {
  determineReschedulePreventionRedirect,
  type ReschedulePreventionRedirectInput,
  type ReschedulePreventionRedirectResult,
} from "./determineReschedulePreventionRedirect";

// Mock the constants module
vi.mock("@calcom/lib/constants", async () => {
  const actual = (await vi.importActual("@calcom/lib/constants")) as typeof import("@calcom/lib/constants");
  return {
    ...actual,
    ENV_PAST_BOOKING_RESCHEDULE_CHANGE_TEAM_IDS: undefined, // Default to undefined, will be overridden in tests
  };
});

const createTestBooking = (overrides?: {
  uid?: string;
  status?: BookingStatus;
  endTime?: Date | null;
  responses?: JsonValue;
  eventType?: {
    disableRescheduling?: boolean | null;
    allowReschedulingPastBookings?: boolean | null;
    allowBookingFromCancelledBookingReschedule?: boolean | null;
    teamId?: number | null;
  } | null;
  dynamicEventSlugRef?: string | null;
}) => ({
  uid: overrides?.uid || "test-booking-uid",
  status: overrides?.status || BookingStatus.ACCEPTED,
  endTime: overrides?.endTime !== undefined ? overrides.endTime : futureDate(5),
  responses: overrides?.responses || {
    name: "John Doe",
    email: "john.doe@example.com",
  },
  eventType:
    overrides?.eventType !== undefined
      ? overrides.eventType
      : // Default values from DB
        {
          disableRescheduling: false,
          allowReschedulingPastBookings: false,
          allowBookingFromCancelledBookingReschedule: false,
          teamId: null,
        },
  dynamicEventSlugRef: overrides?.dynamicEventSlugRef !== undefined ? overrides.dynamicEventSlugRef : null,
});

const createReschedulePreventionRedirectInput = (overrides?: {
  booking?: ReturnType<typeof createTestBooking>;
  eventUrl?: string;
  forceRescheduleForCancelledBooking?: boolean;
}): ReschedulePreventionRedirectInput => ({
  booking: overrides?.booking || createTestBooking(),
  eventUrl: overrides?.eventUrl || "https://example.com/event",
  forceRescheduleForCancelledBooking: overrides?.forceRescheduleForCancelledBooking || false,
});

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const futureDate = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const expectRedirectToBookingDetailsPage = (
  result: ReschedulePreventionRedirectResult,
  bookingUid: string
) => {
  expect(result).toBe(`/booking/${bookingUid}`);
};

const expectRedirectToEventBookingUrl = (result: ReschedulePreventionRedirectResult, eventUrl: string) => {
  expect(result).toBe(eventUrl);
};

const expectRedirectToEventBookingPageWithParams = ({
  result,
  eventUrl,
  params,
}: {
  result: ReschedulePreventionRedirectResult;
  eventUrl: string;
  params: Record<string, string>;
}) => {
  console.log("expectRedirectToEventBookingPageWithParams", { result, eventUrl, params });
  if (!result) {
    throw new Error("We expected a redirect result");
  }

  const actualRedirectUrlObject = new URL(result);
  Object.entries(params).forEach(([key, value]) => {
    expect(actualRedirectUrlObject.searchParams.get(key)).toBe(value);
  });
  expect(`${actualRedirectUrlObject.origin + actualRedirectUrlObject.pathname}`).toBe(eventUrl);
};

const expectToNotPreventReschedule = (result: ReschedulePreventionRedirectResult) => {
  expect(result).toBeNull();
};

describe("determineReschedulePreventionRedirect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:00:00Z"));
    // Reset mocked constant to default before each test
    vi.mocked(constants).ENV_PAST_BOOKING_RESCHEDULE_CHANGE_TEAM_IDS = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("when booking status is accepted and booking is in future", () => {
    it("should not prevent reschedule if disableRescheduling is false", () => {
      const testData = {
        booking: createTestBooking({
          status: BookingStatus.ACCEPTED,
          endTime: futureDate(5),
        }),
      };

      const input = createReschedulePreventionRedirectInput(testData);
      const result = determineReschedulePreventionRedirect(input);

      expectToNotPreventReschedule(result);
    });

    it("should redirect to booking details/status page when rescheduling is disabled(disableRescheduling is true)", () => {
      const input = createReschedulePreventionRedirectInput({
        booking: createTestBooking({
          status: BookingStatus.ACCEPTED,
          endTime: futureDate(5),
          eventType: {
            disableRescheduling: true,
          },
        }),
      });
      const result = determineReschedulePreventionRedirect(input);

      expectRedirectToBookingDetailsPage(result, input.booking.uid);
    });
  });

  describe("when booking status is cancelled", () => {
    it("should redirect to booking details/status page by default", () => {
      const input = createReschedulePreventionRedirectInput({
        booking: createTestBooking({
          status: BookingStatus.CANCELLED,
        }),
      });
      const result = determineReschedulePreventionRedirect(input);

      expectRedirectToBookingDetailsPage(result, input.booking.uid);
    });

    it("should redirect to new booking page when `allowBookingFromCancelledBookingReschedule` is true", () => {
      const testData = {
        booking: createTestBooking({
          status: BookingStatus.CANCELLED,
          eventType: {
            allowBookingFromCancelledBookingReschedule: true,
          },
        }),
        eventUrl: "https://example.com/event",
      };

      const input = createReschedulePreventionRedirectInput(testData);
      const result = determineReschedulePreventionRedirect(input);

      expectRedirectToEventBookingUrl(result, testData.eventUrl);
    });

    it("should not prevent reschedule when `forceRescheduleForCancelledBooking` is true regardless of `allowBookingFromCancelledBookingReschedule`", () => {
      const inputWhenallowBookingFromCancelledBookingRescheduleIsFalse =
        createReschedulePreventionRedirectInput({
          booking: createTestBooking({
            status: BookingStatus.CANCELLED,
            eventType: {
              allowBookingFromCancelledBookingReschedule: false,
            },
          }),
          forceRescheduleForCancelledBooking: true,
        });

      const resultWhenallowBookingFromCancelledBookingRescheduleIsFalse =
        determineReschedulePreventionRedirect(inputWhenallowBookingFromCancelledBookingRescheduleIsFalse);
      expectToNotPreventReschedule(resultWhenallowBookingFromCancelledBookingRescheduleIsFalse);

      const inputWhenallowBookingFromCancelledBookingRescheduleIsTrue =
        createReschedulePreventionRedirectInput({
          booking: createTestBooking({
            status: BookingStatus.CANCELLED,
            eventType: {
              allowBookingFromCancelledBookingReschedule: true,
            },
          }),
          forceRescheduleForCancelledBooking: true,
        });
      const resultWhenallowBookingFromCancelledBookingRescheduleIsTrue =
        determineReschedulePreventionRedirect(inputWhenallowBookingFromCancelledBookingRescheduleIsTrue);

      expectToNotPreventReschedule(resultWhenallowBookingFromCancelledBookingRescheduleIsTrue);
    });
  });

  describe("when booking status is rejected", () => {
    it("should redirect to booking details/status page by default", () => {
      const input = createReschedulePreventionRedirectInput({
        booking: createTestBooking({
          status: BookingStatus.REJECTED,
        }),
      });
      const result = determineReschedulePreventionRedirect(input);

      expectRedirectToBookingDetailsPage(result, input.booking.uid);
    });

    it("should redirect to booking details/status page even when `allowBookingFromCancelledBookingReschedule` is true as that config doesn't apply to rejected bookings", () => {
      const input = createReschedulePreventionRedirectInput({
        booking: createTestBooking({
          status: BookingStatus.REJECTED,
          eventType: {
            allowBookingFromCancelledBookingReschedule: true,
          },
        }),
      });
      const result = determineReschedulePreventionRedirect(input);

      expectRedirectToBookingDetailsPage(result, input.booking.uid);
    });

    it("Current Behavior: Current behaviour is to not prevent reschedule. But EXPECTED(should redirect to booking details page even when `forceRescheduleForCancelledBooking` as that config doesn't apply to rejected bookings). ", () => {
      const inputWhenallowBookingFromCancelledBookingRescheduleIsFalse =
        createReschedulePreventionRedirectInput({
          booking: createTestBooking({
            status: BookingStatus.REJECTED,
            eventType: {
              allowBookingFromCancelledBookingReschedule: false,
            },
          }),
          forceRescheduleForCancelledBooking: true,
        });

      const resultWhenallowBookingFromCancelledBookingRescheduleIsFalse =
        determineReschedulePreventionRedirect(inputWhenallowBookingFromCancelledBookingRescheduleIsFalse);
      // expectRedirectToBookingDetailsPage(
      //   resultWhenallowBookingFromCancelledBookingRescheduleIsFalse,
      //   inputWhenallowBookingFromCancelledBookingRescheduleIsFalse.booking.uid
      // );
      expectToNotPreventReschedule(resultWhenallowBookingFromCancelledBookingRescheduleIsFalse);

      const inputWhenallowBookingFromCancelledBookingRescheduleIsTrue =
        createReschedulePreventionRedirectInput({
          booking: createTestBooking({
            status: BookingStatus.REJECTED,
            eventType: {
              allowBookingFromCancelledBookingReschedule: true,
            },
          }),
          forceRescheduleForCancelledBooking: true,
        });
      const resultWhenallowBookingFromCancelledBookingRescheduleIsTrue =
        determineReschedulePreventionRedirect(inputWhenallowBookingFromCancelledBookingRescheduleIsTrue);

      // expectRedirectToBookingDetailsPage(
      //   resultWhenallowBookingFromCancelledBookingRescheduleIsTrue,
      //   inputWhenallowBookingFromCancelledBookingRescheduleIsTrue.booking.uid
      // );
      expectToNotPreventReschedule(resultWhenallowBookingFromCancelledBookingRescheduleIsTrue);
    });
  });

  describe("when booking is in the past - Default behaviour(without ENV_PAST_BOOKING_RESCHEDULE_CHANGE_TEAM_IDS)", () => {
    it("should redirect to new booking page with prefilled params when allowReschedulingPastBookings is false", () => {
      const input = createReschedulePreventionRedirectInput({
        booking: createTestBooking({
          endTime: daysAgo(5),
          responses: {
            name: "John Doe",
            email: "john.doe@example.com",
          },
          eventType: {
            allowReschedulingPastBookings: false,
          },
        }),
      });
      const result = determineReschedulePreventionRedirect(input);

      expectRedirectToEventBookingPageWithParams({
        result,
        eventUrl: "https://example.com/event",
        params: {
          name: "John Doe",
          email: "john.doe@example.com",
        },
      });
    });

    it("should not prevent reschedule when allowReschedulingPastBookings is true", () => {
      const input = createReschedulePreventionRedirectInput({
        booking: createTestBooking({
          endTime: daysAgo(5),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: true,
            allowBookingFromCancelledBookingReschedule: false,
          },
        }),
      });
      const result = determineReschedulePreventionRedirect(input);

      expectToNotPreventReschedule(result);
    });
  });

  describe("when booking is in the past - New behaviour(based on ENV_PAST_BOOKING_RESCHEDULE_CHANGE_TEAM_IDS)", () => {
    beforeEach(() => {
      vi.mocked(constants).ENV_PAST_BOOKING_RESCHEDULE_CHANGE_TEAM_IDS = "123,456,789";
    });

    it("should redirect to booking status page instead of event URL when the event's teamId is in the environment variable", () => {
      const input = createReschedulePreventionRedirectInput({
        booking: createTestBooking({
          uid: "team-booking-uid",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(3),
          eventType: {
            teamId: 456, // This team ID is in the environment variable
          },
        }),
      });
      const result = determineReschedulePreventionRedirect(input);

      expectRedirectToBookingDetailsPage(result, input.booking.uid);
    });

    it("should redirect to event URL when the event's teamId is not in the environment variable", () => {
      const input = createReschedulePreventionRedirectInput({
        booking: createTestBooking({
          uid: "non-team-booking-uid",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(3),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false,
            allowBookingFromCancelledBookingReschedule: false,
            teamId: 999, // This team ID is NOT in the environment variable
          },
        }),
      });
      const result = determineReschedulePreventionRedirect(input);

      // Should redirect to eventUrl with name/email params (fallback behavior)
      expectRedirectToEventBookingPageWithParams({
        result,
        eventUrl: "https://example.com/event",
        params: {
          name: "John Doe",
          email: "john.doe@example.com",
        },
      });
    });

    it("should redirect to event URL when booking has no team (individual event)", () => {
      const input = createReschedulePreventionRedirectInput({
        booking: createTestBooking({
          uid: "no-team-booking-uid",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(3),
          eventType: {
            disableRescheduling: false,
            allowReschedulingPastBookings: false,
            allowBookingFromCancelledBookingReschedule: false,
            teamId: null, // No team ID
          },
        }),
      });
      const result = determineReschedulePreventionRedirect(input);

      // Should redirect to eventUrl with name/email params (fallback behavior)
      expectRedirectToEventBookingPageWithParams({
        result,
        eventUrl: "https://example.com/event",
        params: {
          name: "John Doe",
          email: "john.doe@example.com",
        },
      });
    });

    it("should not prevent reschedule when allowReschedulingPastBookings is true even if the teamId is in the environment variable", () => {
      const input = createReschedulePreventionRedirectInput({
        booking: createTestBooking({
          uid: "allowed-past-reschedule-uid",
          status: BookingStatus.ACCEPTED,
          endTime: daysAgo(3),
          eventType: {
            allowReschedulingPastBookings: true, // Past reschedule explicitly allowed
            teamId: 456, // Team ID is in environment variable
          },
        }),
      });
      const result = determineReschedulePreventionRedirect(input);

      expectToNotPreventReschedule(result);
    });
  });
});
