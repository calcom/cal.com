import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckBookingAndDurationLimitsService } from "./checkBookingAndDurationLimits";

vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: (fn: (...args: never[]) => unknown) => fn,
}));

vi.mock("@calcom/features/bookings/lib/checkDurationLimits", () => ({
  checkDurationLimits: vi.fn(),
}));

import { checkDurationLimits } from "@calcom/features/bookings/lib/checkDurationLimits";

const mockCheckDurationLimits = vi.mocked(checkDurationLimits);

describe("CheckBookingAndDurationLimitsService", () => {
  const mockCheckBookingLimits = vi.fn();
  let service: CheckBookingAndDurationLimitsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckBookingLimits.mockResolvedValue(undefined);
    mockCheckDurationLimits.mockResolvedValue(undefined);
    service = new CheckBookingAndDurationLimitsService({
      checkBookingLimitsService: {
        checkBookingLimits: mockCheckBookingLimits,
      },
    });
  });

  it("does nothing when eventType has neither bookingLimits nor durationLimits", async () => {
    const eventType = { id: 1, schedule: null } as any;

    await service._checkBookingAndDurationLimits({
      eventType,
      reqBodyStart: "2025-06-01T10:00:00Z",
    });

    expect(mockCheckBookingLimits).not.toHaveBeenCalled();
    expect(mockCheckDurationLimits).not.toHaveBeenCalled();
  });

  it("calls checkBookingLimits when bookingLimits is set with non-empty keys", async () => {
    const eventType = {
      id: 1,
      bookingLimits: { PER_DAY: 3 },
      durationLimits: null,
      schedule: { timeZone: "America/New_York" },
    };

    await service._checkBookingAndDurationLimits({
      eventType,
      reqBodyStart: "2025-06-01T10:00:00Z",
      reqBodyRescheduleUid: "reschedule-uid-123",
    });

    expect(mockCheckBookingLimits).toHaveBeenCalledWith(
      { PER_DAY: 3 },
      expect.any(Date),
      1,
      "reschedule-uid-123",
      "America/New_York"
    );
    expect(mockCheckDurationLimits).not.toHaveBeenCalled();
  });

  it("calls checkDurationLimits when durationLimits is set", async () => {
    const eventType = {
      id: 2,
      bookingLimits: {},
      durationLimits: { PER_DAY: 120 },
      schedule: null,
    };

    await service._checkBookingAndDurationLimits({
      eventType,
      reqBodyStart: "2025-06-01T10:00:00Z",
    });

    expect(mockCheckBookingLimits).not.toHaveBeenCalled();
    expect(mockCheckDurationLimits).toHaveBeenCalledWith({ PER_DAY: 120 }, expect.any(Date), 2, undefined);
  });

  it("calls both when both bookingLimits and durationLimits are set", async () => {
    const eventType = {
      id: 3,
      bookingLimits: { PER_WEEK: 5 },
      durationLimits: { PER_DAY: 60 },
      schedule: { timeZone: "UTC" },
    };

    await service._checkBookingAndDurationLimits({
      eventType,
      reqBodyStart: "2025-06-01T10:00:00Z",
    });

    expect(mockCheckBookingLimits).toHaveBeenCalledTimes(1);
    expect(mockCheckDurationLimits).toHaveBeenCalledTimes(1);
  });

  it("does nothing when bookingLimits exists but is empty object", async () => {
    const eventType = {
      id: 4,
      bookingLimits: {},
      durationLimits: undefined,
      schedule: null,
    };

    await service._checkBookingAndDurationLimits({
      eventType,
      reqBodyStart: "2025-06-01T10:00:00Z",
    });

    expect(mockCheckBookingLimits).not.toHaveBeenCalled();
    expect(mockCheckDurationLimits).not.toHaveBeenCalled();
  });

  it("propagates errors from checkBookingLimits", async () => {
    mockCheckBookingLimits.mockRejectedValue(new Error("Booking limit exceeded"));
    const eventType = {
      id: 5,
      bookingLimits: { PER_DAY: 1 },
      durationLimits: null,
      schedule: null,
    };

    await expect(
      service._checkBookingAndDurationLimits({
        eventType,
        reqBodyStart: "2025-06-01T10:00:00Z",
      })
    ).rejects.toThrow("Booking limit exceeded");
  });

  it("propagates errors from checkDurationLimits", async () => {
    mockCheckDurationLimits.mockRejectedValue(new Error("Duration limit exceeded"));
    const eventType = {
      id: 6,
      bookingLimits: {},
      durationLimits: { PER_DAY: 30 },
      schedule: null,
    };

    await expect(
      service._checkBookingAndDurationLimits({
        eventType,
        reqBodyStart: "2025-06-01T10:00:00Z",
      })
    ).rejects.toThrow("Duration limit exceeded");
  });

  it("passes schedule timeZone to checkBookingLimits", async () => {
    const eventType = {
      id: 7,
      bookingLimits: { PER_DAY: 2 },
      durationLimits: null,
      schedule: { timeZone: "Asia/Tokyo" },
    };

    await service._checkBookingAndDurationLimits({
      eventType,
      reqBodyStart: "2025-06-01T10:00:00Z",
    });

    expect(mockCheckBookingLimits).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Date),
      7,
      undefined,
      "Asia/Tokyo"
    );
  });

  it("passes undefined timeZone when schedule is null", async () => {
    const eventType = {
      id: 8,
      bookingLimits: { PER_DAY: 2 },
      durationLimits: null,
      schedule: null,
    };

    await service._checkBookingAndDurationLimits({
      eventType,
      reqBodyStart: "2025-06-01T10:00:00Z",
    });

    expect(mockCheckBookingLimits).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Date),
      8,
      undefined,
      undefined
    );
  });
});
