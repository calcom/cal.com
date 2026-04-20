import dayjs from "@calcom/dayjs";
import { BookingDateInPastError, isTimeOutOfBounds } from "@calcom/lib/isOutOfBounds";
import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { getStartTimeForRollingWindowComputation } from "./util";

describe("BookingDateInPastError handling", () => {
  it("should convert BookingDateInPastError to TRPCError with BAD_REQUEST code", () => {
    const testFilteringLogic = () => {
      const mockSlot = {
        time: "2024-05-20T12:30:00.000Z", // Past date
        attendees: 1,
      };

      const mockEventType = {
        minimumBookingNotice: 0,
      };

      const isFutureLimitViolationForTheSlot = false; // Mock this to false

      let isOutOfBounds = false;
      try {
        // This will throw BookingDateInPastError for past dates
        isOutOfBounds = isTimeOutOfBounds({
          time: mockSlot.time,
          minimumBookingNotice: mockEventType.minimumBookingNotice,
        });
      } catch (error) {
        if (error instanceof BookingDateInPastError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw error;
      }

      return !isFutureLimitViolationForTheSlot && !isOutOfBounds;
    };

    // This should throw a TRPCError with BAD_REQUEST code
    expect(() => testFilteringLogic()).toThrow(TRPCError);
    expect(() => testFilteringLogic()).toThrow("Attempting to book a meeting in the past.");
  });
});

describe("getStartTimeForRollingWindowComputation", () => {
  const requestedStartTime = "2050-12-09T00:00:00.000Z";

  it("moves rolling window requests back one month by default", () => {
    expect(
      getStartTimeForRollingWindowComputation({
        startTime: requestedStartTime,
        isRollingWindowPeriodType: true,
      })
    ).toBe(dayjs(requestedStartTime).subtract(1, "month").toISOString());
  });

  it("keeps the requested start time when rolling window adjustment is disabled", () => {
    expect(
      getStartTimeForRollingWindowComputation({
        startTime: requestedStartTime,
        isRollingWindowPeriodType: true,
        disableRollingWindowAdjustment: true,
      })
    ).toBe(requestedStartTime);
  });

  it("keeps the requested start time for non-rolling window requests", () => {
    expect(
      getStartTimeForRollingWindowComputation({
        startTime: requestedStartTime,
        isRollingWindowPeriodType: false,
      })
    ).toBe(requestedStartTime);
  });
});
