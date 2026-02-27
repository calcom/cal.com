import dayjs from "@calcom/dayjs";
import { describe, expect, it } from "vitest";
import { doesBookingRequireConfirmation } from "./doesBookingRequireConfirmation";

describe("doesBookingRequireConfirmation", () => {
  it("returns true when requiresConfirmation is true and no threshold", () => {
    const result = doesBookingRequireConfirmation({
      booking: {
        startTime: new Date("2025-06-01T10:00:00Z"),
        eventType: {
          requiresConfirmation: true,
          metadata: null,
        },
      },
    });

    expect(result).toBe(true);
  });

  it("returns false when requiresConfirmation is false and no threshold", () => {
    const result = doesBookingRequireConfirmation({
      booking: {
        startTime: new Date("2025-06-01T10:00:00Z"),
        eventType: {
          requiresConfirmation: false,
          metadata: null,
        },
      },
    });

    expect(result).toBe(false);
  });

  it("returns undefined when eventType is null", () => {
    const result = doesBookingRequireConfirmation({
      booking: {
        startTime: new Date("2025-06-01T10:00:00Z"),
        eventType: null,
      },
    });

    expect(result).toBeUndefined();
  });

  it("overrides requiresConfirmation to false when booking is far enough in the future", () => {
    const farFutureDate = dayjs().add(30, "days").toDate();

    const result = doesBookingRequireConfirmation({
      booking: {
        startTime: farFutureDate,
        eventType: {
          requiresConfirmation: true,
          metadata: {
            requiresConfirmationThreshold: {
              time: 24,
              unit: "hours",
            },
          },
        },
      },
    });

    expect(result).toBe(false);
  });

  it("keeps requiresConfirmation true when booking is within the threshold", () => {
    const soonDate = dayjs().add(1, "hour").toDate();

    const result = doesBookingRequireConfirmation({
      booking: {
        startTime: soonDate,
        eventType: {
          requiresConfirmation: true,
          metadata: {
            requiresConfirmationThreshold: {
              time: 24,
              unit: "hours",
            },
          },
        },
      },
    });

    expect(result).toBe(true);
  });

  it("does not change false to true even with threshold", () => {
    const soonDate = dayjs().add(1, "hour").toDate();

    const result = doesBookingRequireConfirmation({
      booking: {
        startTime: soonDate,
        eventType: {
          requiresConfirmation: false,
          metadata: {
            requiresConfirmationThreshold: {
              time: 24,
              unit: "hours",
            },
          },
        },
      },
    });

    expect(result).toBe(false);
  });

  it("handles minutes as threshold unit", () => {
    const farFutureDate = dayjs().add(120, "minutes").toDate();

    const result = doesBookingRequireConfirmation({
      booking: {
        startTime: farFutureDate,
        eventType: {
          requiresConfirmation: true,
          metadata: {
            requiresConfirmationThreshold: {
              time: 60,
              unit: "minutes",
            },
          },
        },
      },
    });

    expect(result).toBe(false);
  });
});
