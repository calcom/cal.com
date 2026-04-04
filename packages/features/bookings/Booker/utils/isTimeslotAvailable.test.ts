import { describe, expect, it } from "vitest";

import type { QuickAvailabilityCheck } from "../types";
import { isTimeSlotAvailable } from "./isTimeslotAvailable";

describe("isTimeSlotAvailable", () => {
  // Test when a slot is unavailable according to quick availability checks
  it("should return false when slot is unavailable according to quick availability checks", () => {
    const slotToCheckInIso = "2024-02-08T10:30:00.000Z";
    const quickAvailabilityChecks: QuickAvailabilityCheck[] = [
      {
        utcStartIso: slotToCheckInIso,
        status: "unavailable",
      },
    ];

    const result = isTimeSlotAvailable({
      scheduleData: {
        slots: {
          "2024-02-08": [{ time: slotToCheckInIso }],
        },
      },
      slotToCheckInIso,
      quickAvailabilityChecks,
    });

    expect(result).toBe(false);
  });

  it("should return true when scheduleData is null", () => {
    const slotToCheckInIso = "2024-02-08T10:30:00.000Z";
    const quickAvailabilityChecks: QuickAvailabilityCheck[] = [];

    const result = isTimeSlotAvailable({
      scheduleData: null,
      slotToCheckInIso,
      quickAvailabilityChecks,
    });

    expect(result).toBe(true);
  });

  it("should return true when the date doesn't exist in the schedule data", () => {
    const slotToCheckInIso = "2024-02-08T10:30:00.000Z";
    const quickAvailabilityChecks: QuickAvailabilityCheck[] = [];

    const result = isTimeSlotAvailable({
      scheduleData: {
        slots: {
          "2024-02-09": [{ time: "2024-02-09T10:30:00.000Z" }],
        },
      },
      slotToCheckInIso,
      quickAvailabilityChecks,
    });

    expect(result).toBe(false);
  });

  describe("Different day due to timezone", () => {
    it("should correctly lookup on appropriate date when the day in which to show the slot is before the date in the ISO string", () => {
      const slotToCheckInIso1 = "2024-02-08T10:30:00.000Z";
      const dateToShowSlot1 = "2024-02-07";
      const quickAvailabilityChecks1: QuickAvailabilityCheck[] = [];

      const result1 = isTimeSlotAvailable({
        scheduleData: {
          slots: {
            [dateToShowSlot1]: [{ time: slotToCheckInIso1 }],
          },
        },
        slotToCheckInIso: slotToCheckInIso1,
        quickAvailabilityChecks: quickAvailabilityChecks1,
      });

      expect(result1).toBe(true);

      const slotToCheckInIso2 = "2024-02-01T10:30:00.000Z";
      const dateToShowSlot2 = "2024-01-31";
      const quickAvailabilityChecks2: QuickAvailabilityCheck[] = [];
      const result2 = isTimeSlotAvailable({
        scheduleData: {
          slots: {
            [dateToShowSlot2]: [{ time: slotToCheckInIso2 }],
          },
        },
        slotToCheckInIso: slotToCheckInIso2,
        quickAvailabilityChecks: quickAvailabilityChecks2,
      });

      expect(result2).toBe(true);
    });

    it("should correctly lookup on appropriate date when the day in which to show the slot is after the date in the ISO string", () => {
      const slotToCheckInIso1 = "2024-02-08T10:30:00.000Z";
      const dateToShowSlot1 = "2024-02-09";
      const quickAvailabilityChecks1: QuickAvailabilityCheck[] = [];

      const result1 = isTimeSlotAvailable({
        scheduleData: {
          slots: {
            [dateToShowSlot1]: [{ time: slotToCheckInIso1 }],
          },
        },
        slotToCheckInIso: slotToCheckInIso1,
        quickAvailabilityChecks: quickAvailabilityChecks1,
      });

      expect(result1).toBe(true);

      const slotToCheckInIso2 = "2024-02-01T10:30:00.000Z";
      const dateToShowSlot2 = "2024-01-31";
      const quickAvailabilityChecks2: QuickAvailabilityCheck[] = [];
      const result2 = isTimeSlotAvailable({
        scheduleData: {
          slots: {
            [dateToShowSlot2]: [{ time: slotToCheckInIso2 }],
          },
        },
        slotToCheckInIso: slotToCheckInIso2,
        quickAvailabilityChecks: quickAvailabilityChecks2,
      });

      expect(result2).toBe(true);
    });
  });

  it("should return true when the slot exists in the schedule data", () => {
    const slotToCheckInIso = "2024-02-08T10:30:00.000Z";
    const quickAvailabilityChecks: QuickAvailabilityCheck[] = [];

    const result = isTimeSlotAvailable({
      scheduleData: {
        slots: {
          "2024-02-08": [{ time: slotToCheckInIso }],
        },
      },
      slotToCheckInIso,
      quickAvailabilityChecks,
    });

    expect(result).toBe(true);
  });

  // Test when the slot doesn't exist in the schedule data
  it("should return false when the slot doesn't exist in the schedule data", () => {
    const slotToCheckInIso = "2024-02-08T10:30:00.000Z";
    const differentSlotTime = "2024-02-08T11:30:00.000Z";
    const quickAvailabilityChecks: QuickAvailabilityCheck[] = [];

    const result = isTimeSlotAvailable({
      scheduleData: {
        slots: {
          "2024-02-08": [{ time: differentSlotTime }],
        },
      },
      slotToCheckInIso,
      quickAvailabilityChecks,
    });

    expect(result).toBe(false);
  });

  // Test when the slot is available according to quick availability checks
  it("should check schedule data when slot is available according to quick availability checks", () => {
    const slotToCheckInIso = "2024-02-08T10:30:00.000Z";
    const quickAvailabilityChecks: QuickAvailabilityCheck[] = [
      {
        utcStartIso: slotToCheckInIso,
        status: "available",
      },
    ];

    const result = isTimeSlotAvailable({
      scheduleData: {
        slots: {
          "2024-02-08": [{ time: slotToCheckInIso }],
        },
      },
      slotToCheckInIso,
      quickAvailabilityChecks,
    });

    expect(result).toBe(true);
  });

  // Test with seconds difference in time slots
  it("should return true when slots differ only by seconds", () => {
    const slotToCheckInIso = "2024-02-08T10:30:00.000Z";
    const slotWithSeconds = "2024-02-08T10:30:45.000Z";
    const quickAvailabilityChecks: QuickAvailabilityCheck[] = [];

    const result = isTimeSlotAvailable({
      scheduleData: {
        slots: {
          "2024-02-08": [{ time: slotWithSeconds }],
        },
      },
      slotToCheckInIso,
      quickAvailabilityChecks,
    });

    expect(result).toBe(true);
  });

  it("should return true(give a false positive) when the date string is not in the expected format", () => {
    // Invalid ISO format -> Correct is "2024-02-08T10:30:00.000Z"
    const slotToCheckInIso = "2024-02-8T10:30:00.000Z";
    const quickAvailabilityChecks: QuickAvailabilityCheck[] = [];

    const result = isTimeSlotAvailable({
      scheduleData: {
        slots: {
          "2024-02-08": [{ time: "2024-02-08T12:00:00.000Z" }],
        },
      },
      slotToCheckInIso,
      quickAvailabilityChecks,
    });

    expect(result).toBe(true);
  });
});
