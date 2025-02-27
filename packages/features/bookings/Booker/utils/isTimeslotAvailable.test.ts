import { describe, expect, it } from "vitest";

import type { QuickAvailabilityCheck } from "../components/hooks/useSlots";
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
