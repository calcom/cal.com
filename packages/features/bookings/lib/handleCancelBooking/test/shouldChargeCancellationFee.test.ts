import { describe, expect, it, vi, beforeAll } from "vitest";

import { shouldChargeCancellationFee } from "../../handleCancelBooking";

beforeAll(() => {
  vi.setSystemTime(new Date("2024-09-01T10:00:00Z"));
});

describe("shouldChargeCancellationFee", () => {
  const mockEventType = {
    hosts: [{ user: { id: 101 } }],
    owner: { id: 101 },
    metadata: {
      apps: {
        stripe: {
          cancellationFeeEnabled: true,
          paymentOption: "HOLD",
          cancellationFeeTimeValue: 2,
          cancellationFeeTimeUnit: "hours",
        },
      },
    },
  };

  it("should return false if cancellation fee is not enabled", () => {
    const eventType = {
      ...mockEventType,
      metadata: {
        apps: {
          stripe: {
            cancellationFeeEnabled: false,
            paymentOption: "HOLD",
          },
        },
      },
    };

    const result = shouldChargeCancellationFee(eventType, new Date("2024-09-01T12:00:00Z"), 999);

    expect(result).toBe(false);
  });

  it("should return false if payment option is not HOLD", () => {
    const eventType = {
      ...mockEventType,
      metadata: {
        apps: {
          stripe: {
            cancellationFeeEnabled: true,
            paymentOption: "ON_BOOKING",
          },
        },
      },
    };

    const result = shouldChargeCancellationFee(eventType, new Date("2024-09-01T12:00:00Z"), 999);

    expect(result).toBe(false);
  });

  it("should return false if user is the event owner", () => {
    const result = shouldChargeCancellationFee(mockEventType, new Date("2024-09-01T12:00:00Z"), 101);

    expect(result).toBe(false);
  });

  it("should return false if user is a host", () => {
    const result = shouldChargeCancellationFee(mockEventType, new Date("2024-09-01T12:00:00Z"), 101);

    expect(result).toBe(false);
  });

  it("should return true if cancelled within time threshold (hours)", () => {
    const startTime = new Date("2024-09-01T11:30:00Z");

    const result = shouldChargeCancellationFee(mockEventType, startTime, 999);

    expect(result).toBe(true);
  });

  it("should return false if cancelled outside time threshold (hours)", () => {
    const startTime = new Date("2024-09-01T13:00:00Z");

    const result = shouldChargeCancellationFee(mockEventType, startTime, 999);

    expect(result).toBe(false);
  });

  it("should handle minutes time unit correctly", () => {
    const eventType = {
      ...mockEventType,
      metadata: {
        apps: {
          stripe: {
            cancellationFeeEnabled: true,
            paymentOption: "HOLD",
            cancellationFeeTimeValue: 30,
            cancellationFeeTimeUnit: "minutes",
          },
        },
      },
    };

    const startTime = new Date("2024-09-01T10:15:00Z");

    const result = shouldChargeCancellationFee(eventType, startTime, 999);

    expect(result).toBe(true);
  });

  it("should handle days time unit correctly", () => {
    const eventType = {
      ...mockEventType,
      metadata: {
        apps: {
          stripe: {
            cancellationFeeEnabled: true,
            paymentOption: "HOLD",
            cancellationFeeTimeValue: 1,
            cancellationFeeTimeUnit: "days",
          },
        },
      },
    };

    const startTime = new Date("2024-09-02T09:00:00Z");

    const result = shouldChargeCancellationFee(eventType, startTime, 999);

    expect(result).toBe(true);
  });

  it("should handle invalid metadata gracefully", () => {
    const eventType = {
      hosts: [],
      owner: null,
      metadata: null,
    };

    const result = shouldChargeCancellationFee(eventType, new Date("2024-09-01T12:00:00Z"), 999);

    expect(result).toBe(false);
  });

  it("should return false when timeValue is missing", () => {
    const eventType = {
      ...mockEventType,
      metadata: {
        apps: {
          stripe: {
            cancellationFeeEnabled: true,
            paymentOption: "HOLD",
            cancellationFeeTimeUnit: "hours",
          },
        },
      },
    };

    const result = shouldChargeCancellationFee(eventType, new Date("2024-09-01T11:30:00Z"), 999);

    expect(result).toBe(false);
  });

  it("should return false when timeUnit is missing", () => {
    const eventType = {
      ...mockEventType,
      metadata: {
        apps: {
          stripe: {
            cancellationFeeEnabled: true,
            paymentOption: "HOLD",
            cancellationFeeTimeValue: 2,
          },
        },
      },
    };

    const result = shouldChargeCancellationFee(eventType, new Date("2024-09-01T11:30:00Z"), 999);

    expect(result).toBe(false);
  });
});
