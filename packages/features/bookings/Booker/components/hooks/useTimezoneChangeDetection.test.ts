/**
 * @vitest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { vi } from "vitest";
import { describe, expect, it, beforeEach } from "vitest";

import { TimeFormat } from "@calcom/lib/timeFormat";

import { useTimezoneChangeDetection } from "./useTimezoneChangeDetection";

// Mock the useBookerTime hook
vi.mock("./useBookerTime", () => ({
  useBookerTime: vi.fn(),
}));

const mockUseBookerTime = vi.mocked(await import("./useBookerTime"));

describe("useTimezoneChangeDetection hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with current timezone and not trigger refresh on first render", () => {
    mockUseBookerTime.useBookerTime.mockReturnValue({
      timezone: "America/New_York",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezoneFromBookerStore: "America/New_York",
      timezoneFromTimePreferences: "America/New_York",
    });

    const eventData = {
      restrictionScheduleId: 1,
      useBookerTimezone: true,
    };

    const { result } = renderHook(() => useTimezoneChangeDetection(eventData));

    expect(result.current.shouldRefreshSlots).toBe(false);
    expect(result.current.currentTimezone).toBe("America/New_York");
    expect(result.current.previousTimezone).toBe("America/New_York"); // Now initialized with current timezone
  });

  it("should detect timezone change and trigger refresh when all conditions are met", () => {
    mockUseBookerTime.useBookerTime.mockReturnValue({
      timezone: "America/New_York",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezoneFromBookerStore: "America/New_York",
      timezoneFromTimePreferences: "America/New_York",
    });

    const eventData = {
      restrictionScheduleId: 1,
      useBookerTimezone: true,
    };

    const { result, rerender } = renderHook(() => useTimezoneChangeDetection(eventData));

    // Initial render - should not refresh
    expect(result.current.shouldRefreshSlots).toBe(false);

    // Change timezone
    mockUseBookerTime.useBookerTime.mockReturnValue({
      timezone: "America/Los_Angeles",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezoneFromBookerStore: "America/Los_Angeles",
      timezoneFromTimePreferences: "America/Los_Angeles",
    });

    rerender();

    expect(result.current.shouldRefreshSlots).toBe(true);
    expect(result.current.currentTimezone).toBe("America/Los_Angeles");
    expect(result.current.previousTimezone).toBe("America/New_York");
  });

  it("should not trigger refresh when timezone changes but restrictionScheduleId is null", () => {
    mockUseBookerTime.useBookerTime.mockReturnValue({
      timezone: "America/New_York",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezoneFromBookerStore: "America/New_York",
      timezoneFromTimePreferences: "America/New_York",
    });

    const eventData = {
      restrictionScheduleId: null,
      useBookerTimezone: true,
    };

    const { result, rerender } = renderHook(() => useTimezoneChangeDetection(eventData));

    // Change timezone
    mockUseBookerTime.useBookerTime.mockReturnValue({
      timezone: "America/Los_Angeles",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezoneFromBookerStore: "America/Los_Angeles",
      timezoneFromTimePreferences: "America/Los_Angeles",
    });

    rerender();

    expect(result.current.shouldRefreshSlots).toBe(false);
  });

  it("should not trigger refresh when timezone changes but useBookerTimezone is false", () => {
    mockUseBookerTime.useBookerTime.mockReturnValue({
      timezone: "America/New_York",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezoneFromBookerStore: "America/New_York",
      timezoneFromTimePreferences: "America/New_York",
    });

    const eventData = {
      restrictionScheduleId: 1,
      useBookerTimezone: false,
    };

    const { result, rerender } = renderHook(() => useTimezoneChangeDetection(eventData));

    // Change timezone
    mockUseBookerTime.useBookerTime.mockReturnValue({
      timezone: "America/Los_Angeles",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezoneFromBookerStore: "America/Los_Angeles",
      timezoneFromTimePreferences: "America/Los_Angeles",
    });

    rerender();

    expect(result.current.shouldRefreshSlots).toBe(false);
  });

  it("should not trigger refresh when timezone changes but restrictionScheduleId is undefined", () => {
    mockUseBookerTime.useBookerTime.mockReturnValue({
      timezone: "America/New_York",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezoneFromBookerStore: "America/New_York",
      timezoneFromTimePreferences: "America/New_York",
    });

    const eventData = {
      restrictionScheduleId: undefined,
      useBookerTimezone: true,
    };

    const { result, rerender } = renderHook(() => useTimezoneChangeDetection(eventData));

    // Change timezone
    mockUseBookerTime.useBookerTime.mockReturnValue({
      timezone: "America/Los_Angeles",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezoneFromBookerStore: "America/Los_Angeles",
      timezoneFromTimePreferences: "America/Los_Angeles",
    });

    rerender();

    expect(result.current.shouldRefreshSlots).toBe(false);
  });

  it("should handle null eventData gracefully", () => {
    mockUseBookerTime.useBookerTime.mockReturnValue({
      timezone: "America/New_York",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezoneFromBookerStore: "America/New_York",
      timezoneFromTimePreferences: "America/New_York",
    });

    const { result, rerender } = renderHook(() => useTimezoneChangeDetection(null));

    // Change timezone
    mockUseBookerTime.useBookerTime.mockReturnValue({
      timezone: "America/Los_Angeles",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezoneFromBookerStore: "America/Los_Angeles",
      timezoneFromTimePreferences: "America/Los_Angeles",
    });

    rerender();

    expect(result.current.shouldRefreshSlots).toBe(false);
  });

  it("should handle undefined eventData gracefully", () => {
    mockUseBookerTime.useBookerTime.mockReturnValue({
      timezone: "America/New_York",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezoneFromBookerStore: "America/New_York",
      timezoneFromTimePreferences: "America/New_York",
    });

    const { result, rerender } = renderHook(() => useTimezoneChangeDetection(undefined));

    // Change timezone
    mockUseBookerTime.useBookerTime.mockReturnValue({
      timezone: "America/Los_Angeles",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezoneFromBookerStore: "America/Los_Angeles",
      timezoneFromTimePreferences: "America/Los_Angeles",
    });

    rerender();

    expect(result.current.shouldRefreshSlots).toBe(false);
  });

  it("should update previousTimezone ref when timezone changes", async () => {
    mockUseBookerTime.useBookerTime.mockReturnValue({
      timezone: "America/New_York",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezoneFromBookerStore: "America/New_York",
      timezoneFromTimePreferences: "America/New_York",
    });

    const eventData = {
      restrictionScheduleId: 1,
      useBookerTimezone: true,
    };

    const { result, rerender } = renderHook(() => useTimezoneChangeDetection(eventData));

    // Initial state - should be initialized with current timezone
    expect(result.current.previousTimezone).toBe("America/New_York");

    // Force a re-render to trigger useEffect
    rerender();

    // After useEffect runs on initial render, previousTimezone should be set
    expect(result.current.previousTimezone).toBe("America/New_York");
    expect(result.current.currentTimezone).toBe("America/New_York");

    // Change timezone
    mockUseBookerTime.useBookerTime.mockReturnValue({
      timezone: "America/Los_Angeles",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezoneFromBookerStore: "America/Los_Angeles",
      timezoneFromTimePreferences: "America/Los_Angeles",
    });

    rerender();

    // After timezone change, current should be new, previous should be old until next effect
    expect(result.current.currentTimezone).toBe("America/Los_Angeles");
    expect(result.current.previousTimezone).toBe("America/New_York");

    // Trigger another rerender to update the ref
    rerender();

    // Now previousTimezone should be updated
    expect(result.current.previousTimezone).toBe("America/Los_Angeles");
    expect(result.current.currentTimezone).toBe("America/Los_Angeles");
  });

  it("should work with different timezone formats", () => {
    const timezones = ["UTC", "Europe/London", "Asia/Tokyo", "Australia/Sydney", "America/Chicago"];

    timezones.forEach((timezone) => {
      mockUseBookerTime.useBookerTime.mockReturnValue({
        timezone,
        timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
        timezoneFromBookerStore: timezone,
        timezoneFromTimePreferences: timezone,
      });

      const eventData = {
        restrictionScheduleId: 1,
        useBookerTimezone: true,
      };

      const { result } = renderHook(() => useTimezoneChangeDetection(eventData));

      expect(result.current.currentTimezone).toBe(timezone);
    });
  });

  it("should handle rapid timezone changes correctly", () => {
    const timezones = ["America/New_York", "America/Los_Angeles", "Europe/London"];

    mockUseBookerTime.useBookerTime.mockReturnValue({
      timezone: timezones[0],
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezoneFromBookerStore: timezones[0],
      timezoneFromTimePreferences: timezones[0],
    });

    const eventData = {
      restrictionScheduleId: 1,
      useBookerTimezone: true,
    };

    const { result, rerender } = renderHook(() => useTimezoneChangeDetection(eventData));

    // Test rapid changes
    timezones.forEach((timezone, index) => {
      if (index === 0) return; // Skip first as it's already set

      mockUseBookerTime.useBookerTime.mockReturnValue({
        timezone,
        timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
        timezoneFromBookerStore: timezone,
        timezoneFromTimePreferences: timezone,
      });

      rerender();

      expect(result.current.currentTimezone).toBe(timezone);
      expect(result.current.shouldRefreshSlots).toBe(true);
    });
  });
});
