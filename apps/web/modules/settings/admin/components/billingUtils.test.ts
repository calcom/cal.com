import { describe, it, expect, vi, afterEach } from "vitest";

import { formatCyclePosition } from "./billingUtils";

function mockT(key: string, opts?: Record<string, unknown>): string {
  if (opts) {
    return `${key}:${JSON.stringify(opts)}`;
  }
  return key;
}

describe("formatCyclePosition", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when subscriptionStart is null", () => {
    expect(formatCyclePosition(null, "2026-04-01T00:00:00Z", "MONTHLY", mockT)).toBeNull();
  });

  it("returns null when subscriptionEnd is null", () => {
    expect(formatCyclePosition("2026-03-01T00:00:00Z", null, "MONTHLY", mockT)).toBeNull();
  });

  it("returns null when billingPeriod is null", () => {
    expect(
      formatCyclePosition("2026-03-01T00:00:00Z", "2026-04-01T00:00:00Z", null, mockT)
    ).toBeNull();
  });

  it("returns null for unknown billing period", () => {
    expect(
      formatCyclePosition("2026-03-01T00:00:00Z", "2026-04-01T00:00:00Z", "WEEKLY", mockT)
    ).toBeNull();
  });

  describe("MONTHLY", () => {
    it("computes day position mid-cycle", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));

      const result = formatCyclePosition(
        "2026-03-01T00:00:00Z",
        "2026-03-31T00:00:00Z",
        "MONTHLY",
        mockT
      );

      const parsed = JSON.parse(result!.replace("day_x_of_y:", ""));
      expect(parsed.current).toBe(15);
      expect(parsed.total).toBe(30);
    });

    it("clamps current day to minimum of 1 when before start", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-02-28T12:00:00Z"));

      const result = formatCyclePosition(
        "2026-03-01T00:00:00Z",
        "2026-03-31T00:00:00Z",
        "MONTHLY",
        mockT
      );

      const parsed = JSON.parse(result!.replace("day_x_of_y:", ""));
      expect(parsed.current).toBe(1);
    });

    it("clamps current day to total when past end", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-04-05T12:00:00Z"));

      const result = formatCyclePosition(
        "2026-03-01T00:00:00Z",
        "2026-03-31T00:00:00Z",
        "MONTHLY",
        mockT
      );

      const parsed = JSON.parse(result!.replace("day_x_of_y:", ""));
      expect(parsed.current).toBe(parsed.total);
    });

    it("returns day 1 on the start date", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-01T00:00:00Z"));

      const result = formatCyclePosition(
        "2026-03-01T00:00:00Z",
        "2026-03-31T00:00:00Z",
        "MONTHLY",
        mockT
      );

      const parsed = JSON.parse(result!.replace("day_x_of_y:", ""));
      expect(parsed.current).toBe(1);
    });
  });

  describe("ANNUALLY", () => {
    it("computes month position mid-cycle", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));

      const result = formatCyclePosition(
        "2026-01-01T00:00:00Z",
        "2026-12-31T00:00:00Z",
        "ANNUALLY",
        mockT
      );

      const parsed = JSON.parse(result!.replace("month_x_of_y:", ""));
      expect(parsed.current).toBe(6);
      expect(parsed.total).toBe(12);
    });

    it("returns month 1 on start date", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      const result = formatCyclePosition(
        "2026-01-01T00:00:00Z",
        "2026-12-31T00:00:00Z",
        "ANNUALLY",
        mockT
      );

      const parsed = JSON.parse(result!.replace("month_x_of_y:", ""));
      expect(parsed.current).toBe(1);
    });

    it("clamps month to 12 when past end", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2027-03-01T12:00:00Z"));

      const result = formatCyclePosition(
        "2026-01-01T00:00:00Z",
        "2026-12-31T00:00:00Z",
        "ANNUALLY",
        mockT
      );

      const parsed = JSON.parse(result!.replace("month_x_of_y:", ""));
      expect(parsed.current).toBe(12);
    });

    it("clamps month to 1 when before start", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-11-01T12:00:00Z"));

      const result = formatCyclePosition(
        "2026-01-01T00:00:00Z",
        "2026-12-31T00:00:00Z",
        "ANNUALLY",
        mockT
      );

      const parsed = JSON.parse(result!.replace("month_x_of_y:", ""));
      expect(parsed.current).toBe(1);
    });
  });
});
