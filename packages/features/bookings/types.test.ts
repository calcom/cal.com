/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";

import type { BookerEvent } from "./types";

describe("BookerEvent type extensions", () => {
  it("should include the new timezone-related properties", () => {
    // Test that the BookerEvent type includes the new properties
    const mockBookerEvent: Partial<BookerEvent> = {
      restrictionScheduleId: 123,
      useBookerTimezone: true,
      title: "Test Event",
      duration: 30,
    };

    expect(mockBookerEvent.restrictionScheduleId).toBe(123);
    expect(mockBookerEvent.useBookerTimezone).toBe(true);
  });

  it("should handle null values for restriction schedule", () => {
    const mockBookerEvent: Partial<BookerEvent> = {
      restrictionScheduleId: null,
      useBookerTimezone: false,
    };

    expect(mockBookerEvent.restrictionScheduleId).toBe(null);
    expect(mockBookerEvent.useBookerTimezone).toBe(false);
  });

  it("should handle undefined values", () => {
    const mockBookerEvent: Partial<BookerEvent> = {
      restrictionScheduleId: undefined,
      useBookerTimezone: undefined,
    };

    expect(mockBookerEvent.restrictionScheduleId).toBe(undefined);
    expect(mockBookerEvent.useBookerTimezone).toBe(undefined);
  });
});
