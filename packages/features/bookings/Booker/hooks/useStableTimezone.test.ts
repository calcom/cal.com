/**
 * @vitest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { useStableTimezone } from "./useStableTimezone";

describe("useStableTimezone", () => {
  it("returns the raw timezone when no restriction schedule is provided", () => {
    const { result } = renderHook(() => useStableTimezone("America/New_York"));
    expect(result.current).toBe("America/New_York");
  });

  it("returns the raw timezone when restriction schedule is undefined", () => {
    const { result } = renderHook(() => useStableTimezone("America/New_York", undefined));
    expect(result.current).toBe("America/New_York");
  });

  it("returns the raw timezone when restriction schedule id is null", () => {
    const { result } = renderHook(() =>
      useStableTimezone("America/New_York", { id: null, useBookerTimezone: false })
    );
    expect(result.current).toBe("America/New_York");
  });

  it("returns the raw timezone when restriction schedule id is 0", () => {
    const { result } = renderHook(() =>
      useStableTimezone("America/New_York", { id: 0, useBookerTimezone: false })
    );
    expect(result.current).toBe("America/New_York");
  });

  it("returns the raw timezone when useBookerTimezone is true (timezone should follow the booker)", () => {
    const { result } = renderHook(() =>
      useStableTimezone("America/New_York", { id: 1, useBookerTimezone: true })
    );
    expect(result.current).toBe("America/New_York");
  });

  it("pins to initial timezone when restriction schedule exists and useBookerTimezone is false", () => {
    let timezone = "America/New_York";
    const { result, rerender } = renderHook(() =>
      useStableTimezone(timezone, { id: 1, useBookerTimezone: false })
    );
    expect(result.current).toBe("America/New_York");

    timezone = "Europe/London";
    rerender();
    expect(result.current).toBe("America/New_York");
  });

  it("follows timezone changes when useBookerTimezone is true", () => {
    let timezone = "America/New_York";
    const { result, rerender } = renderHook(() =>
      useStableTimezone(timezone, { id: 1, useBookerTimezone: true })
    );
    expect(result.current).toBe("America/New_York");

    timezone = "Europe/London";
    rerender();
    expect(result.current).toBe("Europe/London");
  });

  it("follows timezone changes when there is no restriction schedule", () => {
    let timezone = "America/New_York";
    const { result, rerender } = renderHook(() => useStableTimezone(timezone));
    expect(result.current).toBe("America/New_York");

    timezone = "Europe/London";
    rerender();
    expect(result.current).toBe("Europe/London");
  });
});
