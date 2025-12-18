/**
 * @vitest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTimezoneChangeDetection } from "./useTimezoneChangeDetection";

vi.mock("./useBookerTime", () => ({
  useBookerTime: vi.fn(),
}));

const { useBookerTime } = await import("./useBookerTime");
const mockUseBookerTime = vi.mocked(useBookerTime);

const mockTimezone = (tz: string) => {
  mockUseBookerTime.mockReturnValue({
    timezone: tz,
    timeFormat: 24,
    timezoneFromBookerStore: tz,
    timezoneFromTimePreferences: tz,
  });
};

describe("useTimezoneChangeDetection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial render", () => {
    it("should not trigger refresh on first render", () => {
      mockTimezone("America/New_York");

      const { result } = renderHook(() =>
        useTimezoneChangeDetection({
          restrictionScheduleId: 1,
          useBookerTimezone: true,
        })
      );

      expect(result.current.shouldRefreshSlots).toBe(false);
      expect(result.current.currentTimezone).toBe("America/New_York");
    });
  });

  describe("timezone change with restriction schedule", () => {
    it("should trigger refresh when timezone changes and all conditions are met", () => {
      mockTimezone("America/New_York");

      const { result, rerender } = renderHook(() =>
        useTimezoneChangeDetection({
          restrictionScheduleId: 1,
          useBookerTimezone: true,
        })
      );

      // Change timezone
      mockTimezone("America/Los_Angeles");
      rerender();

      expect(result.current.shouldRefreshSlots).toBe(true);
      expect(result.current.currentTimezone).toBe("America/Los_Angeles");
      expect(result.current.previousTimezone).toBe("America/New_York");
    });

    it("should NOT refresh when restrictionScheduleId is null", () => {
      mockTimezone("America/New_York");

      const { result, rerender } = renderHook(() =>
        useTimezoneChangeDetection({
          restrictionScheduleId: null,
          useBookerTimezone: true,
        })
      );

      mockTimezone("Europe/London");
      rerender();

      expect(result.current.shouldRefreshSlots).toBe(false);
    });

    it("should NOT refresh when useBookerTimezone is false", () => {
      mockTimezone("America/New_York");

      const { result, rerender } = renderHook(() =>
        useTimezoneChangeDetection({
          restrictionScheduleId: 1,
          useBookerTimezone: false,
        })
      );

      mockTimezone("Europe/London");
      rerender();

      expect(result.current.shouldRefreshSlots).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle null eventData gracefully", () => {
      mockTimezone("UTC");

      const { result, rerender } = renderHook(() => useTimezoneChangeDetection(null));

      mockTimezone("Asia/Tokyo");
      rerender();

      expect(result.current.shouldRefreshSlots).toBe(false);
    });

    it("should handle undefined eventData gracefully", () => {
      mockTimezone("UTC");

      const { result, rerender } = renderHook(() => useTimezoneChangeDetection(undefined));

      mockTimezone("Asia/Tokyo");
      rerender();

      expect(result.current.shouldRefreshSlots).toBe(false);
    });

    it("should update previousTimezone after refresh", () => {
      mockTimezone("America/New_York");

      const { result, rerender } = renderHook(() =>
        useTimezoneChangeDetection({
          restrictionScheduleId: 1,
          useBookerTimezone: true,
        })
      );

      // First change
      mockTimezone("America/Los_Angeles");
      rerender();
      expect(result.current.shouldRefreshSlots).toBe(true);

      // After effect runs, previousTimezone updates
      rerender();
      expect(result.current.previousTimezone).toBe("America/Los_Angeles");
      expect(result.current.shouldRefreshSlots).toBe(false);
    });
  });
});
