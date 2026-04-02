import { describe, expect, it } from "vitest";
import { isSlotEquivalent } from "../../utils/isSlotEquivalent";

describe("isSlotEquivalent", () => {
  it("should return true for exactly matching slots", () => {
    const slotTimeInIso = "2024-02-08T10:30:00.000Z";
    const slotToCheckInIso = "2024-02-08T10:30:00.000Z";
    expect(isSlotEquivalent({ slotTimeInIso, slotToCheckInIso })).toBe(true);
  });

  it("should return true when only seconds differ", () => {
    const slotTimeInIso = "2024-02-08T10:30:00.000Z";
    const slotToCheckInIso = "2024-02-08T10:30:45.000Z";
    expect(isSlotEquivalent({ slotTimeInIso, slotToCheckInIso })).toBe(true);
  });

  it("should return false for different minutes", () => {
    const slotTimeInIso = "2024-02-08T10:30:00.000Z";
    const slotToCheckInIso = "2024-02-08T10:31:00.000Z";
    expect(isSlotEquivalent({ slotTimeInIso, slotToCheckInIso })).toBe(false);
  });

  it("should return false for different hours", () => {
    const slotTimeInIso = "2024-02-08T10:30:00.000Z";
    const slotToCheckInIso = "2024-02-08T11:30:00.000Z";
    expect(isSlotEquivalent({ slotTimeInIso, slotToCheckInIso })).toBe(false);
  });

  it("should return false for different dates", () => {
    const slotTimeInIso = "2024-02-08T10:30:00.000Z";
    const slotToCheckInIso = "2024-02-09T10:30:00.000Z";
    expect(isSlotEquivalent({ slotTimeInIso, slotToCheckInIso })).toBe(false);
  });

  it("should return true for invalid ISO string formats", () => {
    const slotTimeInIso = "2024-2-8T10:30:00.000Z";
    const slotToCheckInIso = "2024-02-08T10:30:00.000Z";
    expect(isSlotEquivalent({ slotTimeInIso, slotToCheckInIso })).toBe(true);
  });

  it("should return true when both inputs are invalid", () => {
    const slotTimeInIso = "invalid-date-1";
    const slotToCheckInIso = "invalid-date-2";
    expect(isSlotEquivalent({ slotTimeInIso, slotToCheckInIso })).toBe(true);
  });
});
