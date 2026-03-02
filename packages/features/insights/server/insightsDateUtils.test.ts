import { describe, it, expect } from "vitest";
import dayjs from "@calcom/dayjs";

import { getTimeView, getDateRanges, formatPeriod, formatPeriodFull } from "./insightsDateUtils";

describe("getTimeView", () => {
  it("should return 'day' for diff <= 30 days", () => {
    expect(getTimeView("2024-01-01", "2024-01-15")).toBe("day");
    expect(getTimeView("2024-01-01", "2024-01-31")).toBe("day");
  });

  it("should return 'week' for diff > 30 and <= 90 days", () => {
    expect(getTimeView("2024-01-01", "2024-03-01")).toBe("week");
    expect(getTimeView("2024-01-01", "2024-03-31")).toBe("week");
  });

  it("should return 'month' for diff > 90 and <= 365 days", () => {
    expect(getTimeView("2024-01-01", "2024-06-01")).toBe("month");
    expect(getTimeView("2024-01-01", "2024-12-31")).toBe("month");
  });

  it("should return 'year' for diff > 365 days", () => {
    expect(getTimeView("2024-01-01", "2025-01-02")).toBe("year");
    expect(getTimeView("2024-01-01", "2026-06-01")).toBe("year");
  });

  it("should return 'day' for same day", () => {
    expect(getTimeView("2024-01-01", "2024-01-01")).toBe("day");
  });
});

describe("getDateRanges", () => {
  it("should return empty array for invalid timeView", () => {
    const result = getDateRanges({
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      timeZone: "UTC",
      timeView: "invalid" as "day",
      weekStart: "Sunday",
    });
    expect(result).toEqual([]);
  });

  it("should generate day ranges", () => {
    const result = getDateRanges({
      startDate: "2024-01-01T00:00:00.000Z",
      endDate: "2024-01-03T23:59:59.999Z",
      timeZone: "UTC",
      timeView: "day",
      weekStart: "Sunday",
    });
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result[0].startDate).toBeDefined();
    expect(result[0].endDate).toBeDefined();
    expect(result[0].formattedDate).toBeDefined();
    expect(result[0].formattedDateFull).toBeDefined();
  });

  it("should generate month ranges", () => {
    const result = getDateRanges({
      startDate: "2024-01-01T00:00:00.000Z",
      endDate: "2024-06-30T23:59:59.999Z",
      timeZone: "UTC",
      timeView: "month",
      weekStart: "Sunday",
    });
    expect(result.length).toBeGreaterThanOrEqual(6);
  });

  it("should generate year ranges", () => {
    const result = getDateRanges({
      startDate: "2024-01-01T00:00:00.000Z",
      endDate: "2026-12-31T23:59:59.999Z",
      timeZone: "UTC",
      timeView: "year",
      weekStart: "Sunday",
    });
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it("should generate week ranges", () => {
    const result = getDateRanges({
      startDate: "2024-01-01T00:00:00.000Z",
      endDate: "2024-02-01T23:59:59.999Z",
      timeZone: "UTC",
      timeView: "week",
      weekStart: "Sunday",
    });
    expect(result.length).toBeGreaterThanOrEqual(4);
  });

  it("should handle Monday as week start", () => {
    const result = getDateRanges({
      startDate: "2024-01-01T00:00:00.000Z",
      endDate: "2024-01-31T23:59:59.999Z",
      timeZone: "UTC",
      timeView: "week",
      weekStart: "Monday",
    });
    expect(result.length).toBeGreaterThan(0);
  });

  it("should have each range include formattedDate and formattedDateFull", () => {
    const result = getDateRanges({
      startDate: "2024-01-01T00:00:00.000Z",
      endDate: "2024-01-07T23:59:59.999Z",
      timeZone: "UTC",
      timeView: "day",
      weekStart: "Sunday",
    });
    for (const range of result) {
      expect(range.formattedDate).toBeTruthy();
      expect(range.formattedDateFull).toBeTruthy();
    }
  });
});

describe("formatPeriod", () => {
  it("should format day view with month when first day", () => {
    const start = dayjs("2024-01-01");
    const end = dayjs("2024-01-01");
    const result = formatPeriod({
      start,
      end,
      timeView: "day",
      wholeStart: start,
      wholeEnd: dayjs("2024-01-31"),
    });
    expect(result).toContain("Jan");
    expect(result).toContain("1");
  });

  it("should format month view", () => {
    const start = dayjs("2024-03-01");
    const end = dayjs("2024-03-31");
    const result = formatPeriod({
      start,
      end,
      timeView: "month",
      wholeStart: dayjs("2024-01-01"),
      wholeEnd: dayjs("2024-12-31"),
    });
    expect(result).toBe("Mar");
  });

  it("should format month view with year when spanning years", () => {
    const start = dayjs("2024-03-01");
    const end = dayjs("2024-03-31");
    const result = formatPeriod({
      start,
      end,
      timeView: "month",
      wholeStart: dayjs("2023-12-01"),
      wholeEnd: dayjs("2024-12-31"),
    });
    expect(result).toBe("Mar 2024");
  });

  it("should format year view", () => {
    const start = dayjs("2024-01-01");
    const end = dayjs("2024-12-31");
    const result = formatPeriod({
      start,
      end,
      timeView: "year",
      wholeStart: dayjs("2023-01-01"),
      wholeEnd: dayjs("2025-12-31"),
    });
    expect(result).toBe("2024");
  });

  it("should format week view within same month", () => {
    const start = dayjs("2024-01-01");
    const end = dayjs("2024-01-07");
    const result = formatPeriod({
      start,
      end,
      timeView: "week",
      wholeStart: dayjs("2024-01-01"),
      wholeEnd: dayjs("2024-01-31"),
    });
    expect(result).toContain("Jan");
    expect(result).toContain("-");
  });

  it("should return empty string for unknown timeView", () => {
    const start = dayjs("2024-01-01");
    const end = dayjs("2024-01-01");
    const result = formatPeriod({
      start,
      end,
      timeView: "unknown" as "day",
      wholeStart: start,
      wholeEnd: end,
    });
    expect(result).toBe("");
  });
});

describe("formatPeriodFull", () => {
  it("should format day view with full date", () => {
    const start = dayjs("2024-01-15");
    const result = formatPeriodFull({
      start,
      end: start,
      timeView: "day",
      wholeStart: dayjs("2024-01-01"),
      wholeEnd: dayjs("2024-01-31"),
    });
    expect(result).toContain("Jan");
    expect(result).toContain("15");
  });

  it("should format month view", () => {
    const start = dayjs("2024-06-01");
    const result = formatPeriodFull({
      start,
      end: dayjs("2024-06-30"),
      timeView: "month",
      wholeStart: dayjs("2024-01-01"),
      wholeEnd: dayjs("2024-12-31"),
    });
    expect(result).toBe("Jun");
  });

  it("should format year view", () => {
    const start = dayjs("2024-01-01");
    const result = formatPeriodFull({
      start,
      end: dayjs("2024-12-31"),
      timeView: "year",
      wholeStart: dayjs("2023-01-01"),
      wholeEnd: dayjs("2025-12-31"),
    });
    expect(result).toBe("2024");
  });

  it("should return empty string for unknown timeView", () => {
    const start = dayjs("2024-01-01");
    const result = formatPeriodFull({
      start,
      end: start,
      timeView: "unknown" as "day",
      wholeStart: start,
      wholeEnd: start,
    });
    expect(result).toBe("");
  });

  it("should include year for day view when spanning years", () => {
    const start = dayjs("2024-06-15");
    const result = formatPeriodFull({
      start,
      end: start,
      timeView: "day",
      wholeStart: dayjs("2023-01-01"),
      wholeEnd: dayjs("2025-12-31"),
    });
    expect(result).toContain("2024");
  });
});
