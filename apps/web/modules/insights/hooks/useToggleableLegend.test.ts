/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useToggleableLegend } from "./useToggleableLegend";

describe("useToggleableLegend", () => {
  const legend = [{ label: "Bookings" }, { label: "Cancellations" }, { label: "No-shows" }];

  it("enables all series by default", () => {
    const { result } = renderHook(() => useToggleableLegend(legend));
    expect(result.current.enabledLegend).toEqual(legend);
  });

  it("respects initialEnabled parameter", () => {
    const { result } = renderHook(() => useToggleableLegend(legend, ["Bookings"]));
    expect(result.current.enabledLegend).toEqual([{ label: "Bookings" }]);
  });

  it("toggles a series off", () => {
    const { result } = renderHook(() => useToggleableLegend(legend));

    act(() => {
      result.current.toggleSeries("Cancellations");
    });

    expect(result.current.enabledLegend).toEqual([{ label: "Bookings" }, { label: "No-shows" }]);
  });

  it("toggles a series back on", () => {
    const { result } = renderHook(() => useToggleableLegend(legend, ["Bookings"]));

    act(() => {
      result.current.toggleSeries("Cancellations");
    });

    expect(result.current.enabledLegend).toEqual([{ label: "Bookings" }, { label: "Cancellations" }]);
  });

  it("can toggle all series off one by one", () => {
    const { result } = renderHook(() => useToggleableLegend(legend));

    act(() => {
      result.current.toggleSeries("Bookings");
    });
    act(() => {
      result.current.toggleSeries("Cancellations");
    });
    act(() => {
      result.current.toggleSeries("No-shows");
    });

    expect(result.current.enabledLegend).toEqual([]);
  });

  it("handles empty legend array", () => {
    const { result } = renderHook(() => useToggleableLegend([]));
    expect(result.current.enabledLegend).toEqual([]);
  });

  it("handles toggling a non-existent label (no-op effectively)", () => {
    const { result } = renderHook(() => useToggleableLegend(legend));

    act(() => {
      result.current.toggleSeries("NonExistent");
    });

    // All original items still enabled (the non-existent label gets added to enabledSeries but doesn't match any legend item)
    expect(result.current.enabledLegend).toEqual(legend);
  });

  it("should maintain stable toggleSeries reference across re-renders", () => {
    const { result, rerender } = renderHook(() => useToggleableLegend(legend));
    const firstToggle = result.current.toggleSeries;
    rerender();
    expect(result.current.toggleSeries).toBe(firstToggle);
  });
});
