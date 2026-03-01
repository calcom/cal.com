import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckBookingAndDurationLimitsService } from "./checkBookingAndDurationLimits";

vi.mock("@calcom/features/bookings/lib/checkDurationLimits", () => ({
  checkDurationLimits: vi.fn().mockResolvedValue(true),
}));

vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: vi.fn((fn: (...args: never[]) => unknown) => fn),
}));

import { checkDurationLimits } from "@calcom/features/bookings/lib/checkDurationLimits";

describe("CheckBookingAndDurationLimitsService", () => {
  const mockCheckBookingLimits = vi.fn().mockResolvedValue(true);
  const mockCheckBookingLimitsService = {
    checkBookingLimits: mockCheckBookingLimits,
  };

  let service: CheckBookingAndDurationLimitsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CheckBookingAndDurationLimitsService({
      checkBookingLimitsService: mockCheckBookingLimitsService as never,
    });
  });

  it("checks booking limits when bookingLimits property exists", async () => {
    await service._checkBookingAndDurationLimits({
      eventType: {
        id: 1,
        bookingLimits: { PER_DAY: 5 },
        durationLimits: null,
        schedule: { timeZone: "UTC" },
      } as never,
      reqBodyStart: "2024-01-15T10:00:00Z",
    });

    expect(mockCheckBookingLimits).toHaveBeenCalledWith(
      { PER_DAY: 5 },
      expect.any(Date),
      1,
      undefined,
      "UTC"
    );
  });

  it("checks duration limits when durationLimits property exists", async () => {
    await service._checkBookingAndDurationLimits({
      eventType: {
        id: 1,
        bookingLimits: null,
        durationLimits: { PER_DAY: 120 },
        schedule: null,
      } as never,
      reqBodyStart: "2024-01-15T10:00:00Z",
    });

    expect(checkDurationLimits).toHaveBeenCalledWith({ PER_DAY: 120 }, expect.any(Date), 1, undefined);
  });

  it("checks both limits when both exist", async () => {
    await service._checkBookingAndDurationLimits({
      eventType: {
        id: 1,
        bookingLimits: { PER_DAY: 5 },
        durationLimits: { PER_WEEK: 300 },
        schedule: { timeZone: "America/New_York" },
      } as never,
      reqBodyStart: "2024-01-15T10:00:00Z",
    });

    expect(mockCheckBookingLimits).toHaveBeenCalled();
    expect(checkDurationLimits).toHaveBeenCalled();
  });

  it("passes rescheduleUid when provided", async () => {
    await service._checkBookingAndDurationLimits({
      eventType: {
        id: 1,
        bookingLimits: { PER_DAY: 5 },
        durationLimits: null,
        schedule: null,
      } as never,
      reqBodyStart: "2024-01-15T10:00:00Z",
      reqBodyRescheduleUid: "reschedule-123",
    });

    expect(mockCheckBookingLimits).toHaveBeenCalledWith(
      { PER_DAY: 5 },
      expect.any(Date),
      1,
      "reschedule-123",
      undefined
    );
  });

  it("skips checks when neither bookingLimits nor durationLimits exist", async () => {
    await service._checkBookingAndDurationLimits({
      eventType: {
        id: 1,
        schedule: null,
      } as never,
      reqBodyStart: "2024-01-15T10:00:00Z",
    });

    expect(mockCheckBookingLimits).not.toHaveBeenCalled();
    expect(checkDurationLimits).not.toHaveBeenCalled();
  });

  it("skips booking limits check when bookingLimits is empty object", async () => {
    await service._checkBookingAndDurationLimits({
      eventType: {
        id: 1,
        bookingLimits: {},
        durationLimits: null,
        schedule: null,
      } as never,
      reqBodyStart: "2024-01-15T10:00:00Z",
    });

    expect(mockCheckBookingLimits).not.toHaveBeenCalled();
  });
});
