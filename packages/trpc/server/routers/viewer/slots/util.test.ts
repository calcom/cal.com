import { describe, it, expect } from "vitest";

import { BookingDateInPastError, isTimeOutOfBounds } from "@calcom/lib/isOutOfBounds";

import { TRPCError } from "@trpc/server";

import { shouldIncludeSlotForDay } from "./util";

describe("shouldIncludeSlotForDay", () => {
  it("allows unlimited when neither numeric nor legacy flag is set", () => {
    expect(shouldIncludeSlotForDay(0, undefined, false)).toBe(true);
    expect(shouldIncludeSlotForDay(10, undefined, false)).toBe(true);
  });

  it("caps to N when firstAvailableSlotsPerDay is provided", () => {
    expect(shouldIncludeSlotForDay(0, 2, false)).toBe(true);
    expect(shouldIncludeSlotForDay(1, 2, false)).toBe(true);
    expect(shouldIncludeSlotForDay(2, 2, false)).toBe(false);
  });

  it("falls back to legacy boolean when N is not provided", () => {
    expect(shouldIncludeSlotForDay(0, undefined, true)).toBe(true);
    expect(shouldIncludeSlotForDay(1, undefined, true)).toBe(false);
  });

  it("numeric cap takes precedence over legacy flag", () => {
    expect(shouldIncludeSlotForDay(1, 3, true)).toBe(true);
    expect(shouldIncludeSlotForDay(3, 3, true)).toBe(false);
  });
});

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
