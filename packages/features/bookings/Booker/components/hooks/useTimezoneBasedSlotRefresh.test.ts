/**
 * @vitest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TimeFormat } from "@calcom/lib/timeFormat";

import { useTimezoneBasedSlotRefresh } from "./useTimezoneBasedSlotRefresh";

vi.mock("./useBookerTime", () => ({
  useBookerTime: vi.fn(),
}));

const { useBookerTime } = await import("./useBookerTime");
const mockUseBookerTime = vi.mocked(useBookerTime);

const mockTimezone = (tz: string) => {
  mockUseBookerTime.mockReturnValue({
    timezone: tz,
    timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
    timezoneFromBookerStore: tz,
    timezoneFromTimePreferences: tz,
  });
};

describe("useTimezoneBasedSlotRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("callback invocation", () => {
    it("should call refreshCallback when timezone changes and useBookerTimezone is true", () => {
      mockTimezone("America/New_York");
      const mockCallback = vi.fn();

      const { rerender } = renderHook(() =>
        useTimezoneBasedSlotRefresh(
          {
            restrictionScheduleId: 1,
            useBookerTimezone: true,
          },
          mockCallback
        )
      );

      // Initial render should not call callback
      expect(mockCallback).not.toHaveBeenCalled();

      // Change timezone
      mockTimezone("America/Los_Angeles");
      rerender();

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it("should NOT call refreshCallback when useBookerTimezone is false", () => {
      mockTimezone("America/New_York");
      const mockCallback = vi.fn();

      const { rerender } = renderHook(() =>
        useTimezoneBasedSlotRefresh(
          {
            restrictionScheduleId: 1,
            useBookerTimezone: false,
          },
          mockCallback
        )
      );

      // Initial render
      expect(mockCallback).not.toHaveBeenCalled();

      // Change timezone
      mockTimezone("America/Los_Angeles");
      rerender();

      // Should still not be called because useBookerTimezone is false
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it("should NOT call refreshCallback when restrictionScheduleId is null", () => {
      mockTimezone("America/New_York");
      const mockCallback = vi.fn();

      const { rerender } = renderHook(() =>
        useTimezoneBasedSlotRefresh(
          {
            restrictionScheduleId: null,
            useBookerTimezone: true,
          },
          mockCallback
        )
      );

      mockTimezone("Europe/London");
      rerender();

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it("should NOT call refreshCallback when eventData is null", () => {
      mockTimezone("America/New_York");
      const mockCallback = vi.fn();

      const { rerender } = renderHook(() => useTimezoneBasedSlotRefresh(null, mockCallback));

      mockTimezone("Asia/Tokyo");
      rerender();

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it("should handle null refreshCallback gracefully", () => {
      mockTimezone("America/New_York");

      const { rerender } = renderHook(() =>
        useTimezoneBasedSlotRefresh(
          {
            restrictionScheduleId: 1,
            useBookerTimezone: true,
          },
          null
        )
      );

      mockTimezone("Europe/Paris");

      // Should not throw when callback is null
      expect(() => rerender()).not.toThrow();
    });
  });

  describe("multiple timezone changes", () => {
    it("should call refreshCallback each time timezone changes when conditions are met", () => {
      mockTimezone("America/New_York");
      const mockCallback = vi.fn();

      const { rerender } = renderHook(() =>
        useTimezoneBasedSlotRefresh(
          {
            restrictionScheduleId: 1,
            useBookerTimezone: true,
          },
          mockCallback
        )
      );

      // First change
      mockTimezone("America/Los_Angeles");
      rerender();
      expect(mockCallback).toHaveBeenCalledTimes(1);

      // Let the ref update
      rerender();

      // Second change
      mockTimezone("Europe/London");
      rerender();
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });

    it("should never call refreshCallback when useBookerTimezone is false, regardless of timezone changes", () => {
      mockTimezone("America/New_York");
      const mockCallback = vi.fn();

      const { rerender } = renderHook(() =>
        useTimezoneBasedSlotRefresh(
          {
            restrictionScheduleId: 1,
            useBookerTimezone: false,
          },
          mockCallback
        )
      );

      // Multiple timezone changes
      mockTimezone("America/Los_Angeles");
      rerender();
      rerender();

      mockTimezone("Europe/London");
      rerender();
      rerender();

      mockTimezone("Asia/Tokyo");
      rerender();
      rerender();

      // Should never be called
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});
