import type { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { shouldChargeNoShowCancellationFee } from "./shouldChargeNoShowCancellationFee";

type EventTypeMetadata = z.infer<typeof eventTypeMetaDataSchemaWithTypedApps>;

beforeAll(() => {
  vi.setSystemTime(new Date("2024-09-01T10:00:00Z"));
});

describe("shouldChargeCancellationFee", () => {
  const mockEventTypeMetadata = {
    apps: {
      stripe: {
        autoChargeNoShowFeeIfCancelled: true,
        paymentOption: "HOLD",
        autoChargeNoShowFeeTimeValue: 2,
        autoChargeNoShowFeeTimeUnit: "hours",
      },
    },
  };

  const mockPayment = {
    appId: "stripe",
  };

  it("should return false if cancellation fee is not enabled", () => {
    const eventTypeMetadata = {
      apps: {
        stripe: {
          autoChargeNoShowFeeIfCancelled: false,
          paymentOption: "HOLD",
        },
      },
    };

    const result = shouldChargeNoShowCancellationFee({
      eventTypeMetadata: eventTypeMetadata as EventTypeMetadata,
      booking: { startTime: new Date("2024-09-01T12:00:00Z") },
      payment: mockPayment,
    });

    expect(result).toBe(false);
  });

  it("should return false if payment option is not HOLD", () => {
    const eventTypeMetadata = {
      apps: {
        stripe: {
          autoChargeNoShowFeeIfCancelled: true,
          paymentOption: "ON_BOOKING",
        },
      },
    };

    const result = shouldChargeNoShowCancellationFee({
      eventTypeMetadata: eventTypeMetadata as EventTypeMetadata,
      booking: { startTime: new Date("2024-09-01T12:00:00Z") },
      payment: mockPayment,
    });

    expect(result).toBe(false);
  });

  it("should return true if cancelled within time threshold (hours)", () => {
    const startTime = new Date("2024-09-01T11:30:00Z");

    const result = shouldChargeNoShowCancellationFee({
      eventTypeMetadata: mockEventTypeMetadata as EventTypeMetadata,
      booking: { startTime },
      payment: mockPayment,
    });

    expect(result).toBe(true);
  });

  it("should return false if cancelled outside time threshold (hours)", () => {
    const startTime = new Date("2024-09-01T13:00:00Z");

    const result = shouldChargeNoShowCancellationFee({
      eventTypeMetadata: mockEventTypeMetadata as EventTypeMetadata,
      booking: { startTime },
      payment: mockPayment,
    });

    expect(result).toBe(false);
  });

  it("should handle minutes time unit correctly", () => {
    const mockEventTypeMetadata = {
      apps: {
        stripe: {
          autoChargeNoShowFeeIfCancelled: true,
          paymentOption: "HOLD",
          autoChargeNoShowFeeTimeValue: 30,
          autoChargeNoShowFeeTimeUnit: "minutes",
        },
      },
    };

    const startTime = new Date("2024-09-01T10:15:00Z");

    const result = shouldChargeNoShowCancellationFee({
      eventTypeMetadata: mockEventTypeMetadata as EventTypeMetadata,
      booking: { startTime },
      payment: mockPayment,
    });

    expect(result).toBe(true);
  });

  it("should handle days time unit correctly", () => {
    const mockEventTypeMetadata = {
      apps: {
        stripe: {
          autoChargeNoShowFeeIfCancelled: true,
          paymentOption: "HOLD",
          autoChargeNoShowFeeTimeValue: 1,
          autoChargeNoShowFeeTimeUnit: "days",
        },
      },
    };

    const startTime = new Date("2024-09-02T09:00:00Z");

    const result = shouldChargeNoShowCancellationFee({
      eventTypeMetadata: mockEventTypeMetadata as EventTypeMetadata,
      booking: { startTime },
      payment: mockPayment,
    });

    expect(result).toBe(true);
  });

  it("should handle invalid metadata gracefully", () => {
    const result = shouldChargeNoShowCancellationFee({
      eventTypeMetadata: null as EventTypeMetadata,
      booking: { startTime: new Date("2024-09-01T12:00:00Z") },
      payment: mockPayment,
    });

    expect(result).toBe(false);
  });

  it("should return false when timeValue is missing", () => {
    const mockEventTypeMetadata = {
      apps: {
        stripe: {
          autoChargeNoShowFeeIfCancelled: true,
          paymentOption: "HOLD",
          autoChargeNoShowFeeTimeUnit: "days",
        },
      },
    };

    const result = shouldChargeNoShowCancellationFee({
      eventTypeMetadata: mockEventTypeMetadata as EventTypeMetadata,
      booking: { startTime: new Date("2024-09-01T12:00:00Z") },
      payment: mockPayment,
    });

    expect(result).toBe(false);
  });

  it("should return false when timeUnit is missing", () => {
    const mockEventTypeMetadata = {
      apps: {
        stripe: {
          autoChargeNoShowFeeIfCancelled: true,
          paymentOption: "HOLD",
          autoChargeNoShowFeeTimeValue: 24,
        },
      },
    };

    const result = shouldChargeNoShowCancellationFee({
      eventTypeMetadata: mockEventTypeMetadata as EventTypeMetadata,
      booking: { startTime: new Date("2024-09-01T12:00:00Z") },
      payment: mockPayment,
    });

    expect(result).toBe(false);
  });
});
