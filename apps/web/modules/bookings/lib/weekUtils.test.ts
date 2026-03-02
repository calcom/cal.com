import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";

import { getWeekStart } from "./weekUtils";

describe("getWeekStart", () => {
  it("returns Sunday for a Thursday when weekStart is Sunday (0)", () => {
    const thursday = dayjs("2025-06-05"); // Thursday
    const result = getWeekStart(thursday, 0);
    expect(result.day()).toBe(0); // Sunday
    expect(result.format("YYYY-MM-DD")).toBe("2025-06-01");
  });

  it("returns Monday for a Thursday when weekStart is Monday (1)", () => {
    const thursday = dayjs("2025-06-05"); // Thursday
    const result = getWeekStart(thursday, 1);
    expect(result.day()).toBe(1); // Monday
    expect(result.format("YYYY-MM-DD")).toBe("2025-06-02");
  });

  it("returns Saturday for a Thursday when weekStart is Saturday (6)", () => {
    const thursday = dayjs("2025-06-05"); // Thursday
    const result = getWeekStart(thursday, 6);
    expect(result.day()).toBe(6); // Saturday
    expect(result.format("YYYY-MM-DD")).toBe("2025-05-31");
  });

  it("returns the same day when date IS the weekStart day", () => {
    const monday = dayjs("2025-06-02"); // Monday
    const result = getWeekStart(monday, 1);
    expect(result.format("YYYY-MM-DD")).toBe("2025-06-02");
  });

  it("defaults to Sunday (0) when weekStart is not provided", () => {
    const wednesday = dayjs("2025-06-04"); // Wednesday
    const result = getWeekStart(wednesday);
    expect(result.day()).toBe(0); // Sunday
    expect(result.format("YYYY-MM-DD")).toBe("2025-06-01");
  });

  it("returns start of day (midnight)", () => {
    const dateWithTime = dayjs("2025-06-05T15:30:00");
    const result = getWeekStart(dateWithTime, 0);
    expect(result.hour()).toBe(0);
    expect(result.minute()).toBe(0);
    expect(result.second()).toBe(0);
  });

  it("handles crossing month boundaries", () => {
    const firstOfMonth = dayjs("2025-06-01"); // Sunday
    const result = getWeekStart(firstOfMonth, 1); // Monday start
    expect(result.format("YYYY-MM-DD")).toBe("2025-05-26"); // Previous Monday
  });

  it("handles crossing year boundaries", () => {
    const jan1 = dayjs("2025-01-01"); // Wednesday
    const result = getWeekStart(jan1, 1); // Monday start
    expect(result.format("YYYY-MM-DD")).toBe("2024-12-30");
  });
});
