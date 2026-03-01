import { HttpError } from "@calcom/lib/http-error";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetTotalBookingDuration = vi.fn().mockResolvedValue(0);

vi.mock("@calcom/prisma", () => ({
  default: {},
}));

vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => {
  return {
    BookingRepository: class {
      getTotalBookingDuration = mockGetTotalBookingDuration;
    },
  };
});

import { checkDurationLimit, checkDurationLimits } from "./checkDurationLimits";

describe("checkDurationLimits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTotalBookingDuration.mockResolvedValue(0);
  });

  it("returns false for null/undefined duration limits", async () => {
    const result = await checkDurationLimits(null as never, new Date(), 1);
    expect(result).toBe(false);
  });

  it("does not throw when total duration is below limit", async () => {
    mockGetTotalBookingDuration.mockResolvedValue(30);
    const result = await checkDurationLimits({ PER_DAY: 120 }, new Date("2024-01-15T10:00:00Z"), 1);
    expect(result).toBe(true);
  });

  it("throws HttpError when duration limit is reached", async () => {
    mockGetTotalBookingDuration.mockResolvedValue(120);
    await expect(checkDurationLimits({ PER_DAY: 120 }, new Date("2024-01-15T10:00:00Z"), 1)).rejects.toThrow(
      HttpError
    );
  });

  it("passes rescheduleUid to repository", async () => {
    mockGetTotalBookingDuration.mockResolvedValue(0);
    await checkDurationLimits({ PER_DAY: 120 }, new Date("2024-01-15T10:00:00Z"), 1, "reschedule-123");
    expect(mockGetTotalBookingDuration).toHaveBeenCalledWith(
      expect.objectContaining({ rescheduleUid: "reschedule-123" })
    );
  });
});

describe("checkDurationLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTotalBookingDuration.mockResolvedValue(0);
  });

  it("returns early when limitingNumber is undefined", async () => {
    await checkDurationLimit({
      key: "PER_DAY",
      limitingNumber: undefined,
      eventStartDate: new Date(),
      eventId: 1,
    });
    expect(mockGetTotalBookingDuration).not.toHaveBeenCalled();
  });

  it("throws 403 when duration limit is reached", async () => {
    mockGetTotalBookingDuration.mockResolvedValue(60);
    await expect(
      checkDurationLimit({
        key: "PER_DAY",
        limitingNumber: 60,
        eventStartDate: new Date("2024-01-15T10:00:00Z"),
        eventId: 1,
      })
    ).rejects.toMatchObject({ statusCode: 403, message: "duration_limit_reached" });
  });

  it("does not throw when below limit", async () => {
    mockGetTotalBookingDuration.mockResolvedValue(30);
    await expect(
      checkDurationLimit({
        key: "PER_WEEK",
        limitingNumber: 120,
        eventStartDate: new Date("2024-01-15T10:00:00Z"),
        eventId: 1,
      })
    ).resolves.not.toThrow();
  });

  it("calculates start and end dates based on the key unit", async () => {
    mockGetTotalBookingDuration.mockResolvedValue(0);
    await checkDurationLimit({
      key: "PER_MONTH",
      limitingNumber: 500,
      eventStartDate: new Date("2024-01-15T10:00:00Z"),
      eventId: 1,
    });
    const call = mockGetTotalBookingDuration.mock.calls[0][0];
    expect(call.startDate.getMonth()).toBe(0);
    expect(call.endDate.getMonth()).toBe(0);
  });
});
