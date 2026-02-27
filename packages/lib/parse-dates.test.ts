import { RRule } from "rrule";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/timeFormat", () => ({
  detectBrowserTimeFormat: "h:mma",
  TimeFormat: {
    TWELVE_HOUR: "h:mma",
    TWENTY_FOUR_HOUR: "HH:mm",
  },
}));

import { parseDate, parseDateTimeWithTimeZone, parseRecurringDates } from "./parse-dates";

describe("parseDate", () => {
  it("returns ['No date'] for null input", () => {
    expect(parseDate(null, "en", "UTC")).toEqual(["No date"]);
  });

  it("returns ['No date'] for empty string", () => {
    expect(parseDate("", "en", "UTC")).toEqual(["No date"]);
  });

  it("returns a formatted string for a valid ISO date", () => {
    const result = parseDate("2025-06-15T10:00:00Z", "en", "UTC");
    expect(typeof result).toBe("string");
    expect(result).toContain("2025");
    // Should contain a time and date portion
    expect((result as string).length).toBeGreaterThan(10);
  });

  it("returns 'Invalid date' for an unparseable date", () => {
    const result = parseDate("not-a-date", "en", "UTC");
    expect(result).toBe("Invalid date");
  });

  it("respects withDefaultTimeFormat option (12-hour)", () => {
    const result = parseDate("2025-06-15T14:30:00Z", "en", "UTC", {
      withDefaultTimeFormat: true,
    });
    expect(typeof result).toBe("string");
  });
});

describe("parseDateTimeWithTimeZone", () => {
  it("returns a formatted string with time and date", () => {
    const date = new Date("2025-06-15T10:00:00Z");
    const result = parseDateTimeWithTimeZone(date, "en", "UTC");

    expect(typeof result).toBe("string");
    // Format is "time, date"
    expect(result).toContain(",");
  });

  it("formats in 12-hour format by default", () => {
    const date = new Date("2025-06-15T14:00:00Z");
    const result = parseDateTimeWithTimeZone(date, "en", "UTC");

    // 14:00 UTC in 12-hour should show 2:00pm or 2:00 PM
    expect(result.toLowerCase()).toMatch(/2:00\s*pm/);
  });

  it("respects withDefaultTimeFormat option", () => {
    const date = new Date("2025-06-15T14:00:00Z");
    const result = parseDateTimeWithTimeZone(date, "en", "UTC", {
      withDefaultTimeFormat: true,
    });

    expect(typeof result).toBe("string");
    // Should use h12 cycle
    expect(result.toLowerCase()).toMatch(/pm|am/);
  });

  it("uses 24-hour format when selectedTimeFormat is TWENTY_FOUR_HOUR", () => {
    const date = new Date("2025-06-15T14:00:00Z");
    const result = parseDateTimeWithTimeZone(date, "en", "UTC", {
      selectedTimeFormat: "HH:mm" as "HH:mm",
    });

    expect(typeof result).toBe("string");
    // 24-hour format should show 14:00
    expect(result).toContain("14:00");
  });

  it("handles different timezones", () => {
    const date = new Date("2025-06-15T00:00:00Z");

    const utcResult = parseDateTimeWithTimeZone(date, "en", "UTC");
    const nyResult = parseDateTimeWithTimeZone(date, "en", "America/New_York");

    // Results should differ because timezone is different
    expect(utcResult).not.toBe(nyResult);
  });

  it("includes full date formatting", () => {
    const date = new Date("2025-06-15T10:00:00Z");
    const result = parseDateTimeWithTimeZone(date, "en", "UTC");

    // Should contain day of week and month (full format)
    expect(result).toContain("June");
    expect(result).toContain("2025");
  });
});

describe("parseRecurringDates", () => {
  it("returns arrays of date strings and Date objects for a weekly recurring event", () => {
    const [dateStrings, dates] = parseRecurringDates(
      {
        startDate: "2025-06-15T10:00:00Z",
        timeZone: "UTC",
        recurringEvent: { freq: RRule.WEEKLY, interval: 1, count: 3 },
        recurringCount: 3,
      },
      "en"
    );

    expect(dateStrings).toHaveLength(3);
    expect(dates).toHaveLength(3);
    dateStrings.forEach((s) => expect(typeof s).toBe("string"));
    dates.forEach((d) => expect(d).toBeInstanceOf(Date));
  });

  it("respects recurringCount to limit number of occurrences", () => {
    const [dateStrings, dates] = parseRecurringDates(
      {
        startDate: "2025-06-15T10:00:00Z",
        timeZone: "UTC",
        recurringEvent: { freq: RRule.WEEKLY, interval: 1, count: 10 },
        recurringCount: 2,
      },
      "en"
    );

    expect(dateStrings).toHaveLength(2);
    expect(dates).toHaveLength(2);
  });

  it("applies timezone correctly (UTC vs America/New_York produce different strings)", () => {
    const [utcStrings] = parseRecurringDates(
      {
        startDate: "2025-06-15T10:00:00Z",
        timeZone: "UTC",
        recurringEvent: { freq: RRule.WEEKLY, interval: 1, count: 1 },
        recurringCount: 1,
      },
      "en"
    );

    const [nyStrings] = parseRecurringDates(
      {
        startDate: "2025-06-15T10:00:00Z",
        timeZone: "America/New_York",
        recurringEvent: { freq: RRule.WEEKLY, interval: 1, count: 1 },
        recurringCount: 1,
      },
      "en"
    );

    expect(utcStrings[0]).not.toBe(nyStrings[0]);
  });

  it("handles selectedTimeFormat option", () => {
    const [dateStrings] = parseRecurringDates(
      {
        startDate: "2025-06-15T14:00:00Z",
        timeZone: "UTC",
        recurringEvent: { freq: RRule.WEEKLY, interval: 1, count: 1 },
        recurringCount: 1,
        selectedTimeFormat: "HH:mm" as "HH:mm",
      },
      "en"
    );

    expect(dateStrings).toHaveLength(1);
    expect(dateStrings[0]).toContain("14:00");
  });
});
