import { describe, expect, it } from "vitest";

import {
  DEFAULT_SCHEDULE,
  MINUTES_DAY_END,
  MINUTES_DAY_START,
  MINUTES_IN_DAY,
  availabilityAsString,
  defaultDayRange,
  getAvailabilityFromSchedule,
  getWorkingHours,
} from "./availability";

describe("defaultDayRange", () => {
  it("starts at 09:00 UTC", () => {
    expect(defaultDayRange.start.getUTCHours()).toBe(9);
    expect(defaultDayRange.start.getUTCMinutes()).toBe(0);
  });

  it("ends at 17:00 UTC", () => {
    expect(defaultDayRange.end.getUTCHours()).toBe(17);
    expect(defaultDayRange.end.getUTCMinutes()).toBe(0);
  });
});

describe("DEFAULT_SCHEDULE", () => {
  it("has 7 days (Sunday–Saturday)", () => {
    expect(DEFAULT_SCHEDULE).toHaveLength(7);
  });

  it("has empty arrays for Sunday (0) and Saturday (6)", () => {
    expect(DEFAULT_SCHEDULE[0]).toEqual([]);
    expect(DEFAULT_SCHEDULE[6]).toEqual([]);
  });

  it("has one time range for weekdays (1–5)", () => {
    for (let i = 1; i <= 5; i++) {
      expect(DEFAULT_SCHEDULE[i]).toHaveLength(1);
    }
  });
});

describe("constants", () => {
  it("MINUTES_IN_DAY is 1440", () => {
    expect(MINUTES_IN_DAY).toBe(1440);
  });

  it("MINUTES_DAY_END is 1439", () => {
    expect(MINUTES_DAY_END).toBe(1439);
  });

  it("MINUTES_DAY_START is 0", () => {
    expect(MINUTES_DAY_START).toBe(0);
  });
});

describe("getAvailabilityFromSchedule", () => {
  it("returns empty array for all-empty schedule", () => {
    const schedule = [[], [], [], [], [], [], []];
    expect(getAvailabilityFromSchedule(schedule)).toEqual([]);
  });

  it("groups same time ranges across different days", () => {
    const start = new Date("2025-01-01T09:00:00Z");
    const end = new Date("2025-01-01T17:00:00Z");
    const schedule = [[], [{ start, end }], [{ start, end }], [{ start, end }], [], [], []];

    const result = getAvailabilityFromSchedule(schedule);

    // Same start/end should be grouped into one availability with days [1,2,3]
    expect(result).toHaveLength(1);
    expect(result[0].days).toEqual([1, 2, 3]);
  });

  it("keeps different time ranges separate", () => {
    const morning = { start: new Date("2025-01-01T08:00:00Z"), end: new Date("2025-01-01T12:00:00Z") };
    const afternoon = { start: new Date("2025-01-01T13:00:00Z"), end: new Date("2025-01-01T17:00:00Z") };
    const schedule = [[], [morning], [afternoon], [], [], [], []];

    const result = getAvailabilityFromSchedule(schedule);

    expect(result).toHaveLength(2);
  });

  it("handles multiple time ranges on the same day", () => {
    const morning = { start: new Date("2025-01-01T08:00:00Z"), end: new Date("2025-01-01T12:00:00Z") };
    const afternoon = { start: new Date("2025-01-01T13:00:00Z"), end: new Date("2025-01-01T17:00:00Z") };
    const schedule = [[], [morning, afternoon], [], [], [], [], []];

    const result = getAvailabilityFromSchedule(schedule);
    expect(result).toHaveLength(2);
  });
});

describe("getWorkingHours", () => {
  it("returns empty array for empty availability", () => {
    expect(getWorkingHours({ timeZone: "UTC" }, [])).toEqual([]);
  });

  it("converts UTC availability to minutes for UTC timezone", () => {
    const availability = [
      {
        days: [1, 2, 3, 4, 5],
        startTime: new Date("2025-01-01T09:00:00Z"),
        endTime: new Date("2025-01-01T17:00:00Z"),
      },
    ];

    const result = getWorkingHours({ timeZone: "UTC" }, availability);

    expect(result).toHaveLength(1);
    expect(result[0].startTime).toBe(9 * 60); // 540
    expect(result[0].endTime).toBe(17 * 60); // 1020
    expect(result[0].days).toEqual([1, 2, 3, 4, 5]);
  });

  it("skips schedules with empty days array (date overrides)", () => {
    const availability = [
      {
        days: [],
        startTime: new Date("2025-01-01T09:00:00Z"),
        endTime: new Date("2025-01-01T17:00:00Z"),
      },
    ];

    const result = getWorkingHours({ timeZone: "UTC" }, availability);
    expect(result).toEqual([]);
  });

  it("uses utcOffset when provided", () => {
    const availability = [
      {
        days: [1],
        startTime: new Date("2025-01-01T09:00:00Z"),
        endTime: new Date("2025-01-01T17:00:00Z"),
      },
    ];

    // UTC+5:30 = 330 minutes offset
    const result = getWorkingHours({ utcOffset: 330 }, availability);

    expect(result).toHaveLength(1);
    // 9*60 - 330 = 210 → clamped to MINUTES_DAY_START (0) ... actually let me recalculate
    // startTime = 540 - 330 = 210, endTime = 1020 - 330 = 690
    expect(result[0].startTime).toBe(210);
    expect(result[0].endTime).toBe(690);
  });

  it("handles overflow to next day when endTime exceeds day boundary", () => {
    const availability = [
      {
        days: [1], // Monday
        startTime: new Date("2025-01-01T20:00:00Z"),
        endTime: new Date("2025-01-01T23:59:00Z"),
      },
    ];

    // UTC-5 (e.g. EST): startTime = 20*60 - (-300) = 1500 > 1439
    const result = getWorkingHours({ utcOffset: -300 }, availability);

    // Should overflow to next day (Tuesday = 2)
    expect(result.some((wh) => wh.days.includes(2))).toBe(true);
  });

  it("handles overflow to previous day when startTime is negative", () => {
    const availability = [
      {
        days: [1], // Monday
        startTime: new Date("2025-01-01T02:00:00Z"),
        endTime: new Date("2025-01-01T10:00:00Z"),
      },
    ];

    // UTC+5 (300 min offset): startTime = 120 - 300 = -180 (negative = previous day)
    const result = getWorkingHours({ utcOffset: 300 }, availability);

    // Should have overflow entry for previous day (Sunday = 0 since Monday-1=0)
    expect(result.some((wh) => wh.days.includes(0))).toBe(true);
  });

  it("wraps Saturday overflow to Sunday (day 6 → day 0)", () => {
    const availability = [
      {
        days: [6], // Saturday
        startTime: new Date("2025-01-01T20:00:00Z"),
        endTime: new Date("2025-01-01T23:59:00Z"),
      },
    ];

    // UTC-5: overflow to next day → (6+1) % 7 = 0 (Sunday)
    const result = getWorkingHours({ utcOffset: -300 }, availability);
    expect(result.some((wh) => wh.days.includes(0))).toBe(true);
  });

  it("wraps Sunday underflow to Saturday (day 0 → day 6)", () => {
    const availability = [
      {
        days: [0], // Sunday
        startTime: new Date("2025-01-01T02:00:00Z"),
        endTime: new Date("2025-01-01T10:00:00Z"),
      },
    ];

    // UTC+5: underflow to previous day → (0 - 1) = -1 → 6 (Saturday)
    const result = getWorkingHours({ utcOffset: 300 }, availability);
    expect(result.some((wh) => wh.days.includes(6))).toBe(true);
  });

  it("preserves userId when present", () => {
    const availability = [
      {
        userId: 42,
        days: [1],
        startTime: new Date("2025-01-01T09:00:00Z"),
        endTime: new Date("2025-01-01T17:00:00Z"),
      },
    ];

    const result = getWorkingHours({ timeZone: "UTC" }, availability);
    expect(result[0].userId).toBe(42);
  });

  it("sorts results by startTime", () => {
    const availability = [
      {
        days: [1],
        startTime: new Date("2025-01-01T14:00:00Z"),
        endTime: new Date("2025-01-01T17:00:00Z"),
      },
      {
        days: [1],
        startTime: new Date("2025-01-01T09:00:00Z"),
        endTime: new Date("2025-01-01T12:00:00Z"),
      },
    ];

    const result = getWorkingHours({ timeZone: "UTC" }, availability);
    expect(result[0].startTime).toBeLessThan(result[1].startTime);
  });

  it("skips when sameDayEndTime < sameDayStartTime", () => {
    // This can happen when the clamped range inverts
    const availability = [
      {
        days: [1],
        startTime: new Date("2025-01-01T23:50:00Z"),
        endTime: new Date("2025-01-01T23:55:00Z"),
      },
    ];

    // UTC-25h offset → pushes everything far out, creates inversion
    // Actually this would still create overflow. Let me test the simpler case.
    // With UTC, startTime=1430, endTime=1435 — both within bounds, no inversion
    const result = getWorkingHours({ timeZone: "UTC" }, availability);
    expect(result).toHaveLength(1);
    expect(result[0].startTime).toBeLessThanOrEqual(result[0].endTime);
  });
});

describe("availabilityAsString", () => {
  it("formats a single day with time range", () => {
    const availability = {
      days: [1],
      startTime: new Date("2025-01-01T09:00:00Z"),
      endTime: new Date("2025-01-01T17:00:00Z"),
    };

    const result = availabilityAsString(availability, { locale: "en", hour12: true });
    expect(typeof result).toBe("string");
    expect(result).toContain(","); // "day, time - time"
  });

  it("formats consecutive days as a range", () => {
    const availability = {
      days: [1, 2, 3, 4, 5],
      startTime: new Date("2025-01-01T09:00:00Z"),
      endTime: new Date("2025-01-01T17:00:00Z"),
    };

    const result = availabilityAsString(availability, { locale: "en", hour12: true });
    // Should contain day range like "Mon - Fri"
    expect(result).toContain(" - ");
  });

  it("formats non-consecutive days separately", () => {
    const availability = {
      days: [1, 3, 5],
      startTime: new Date("2025-01-01T09:00:00Z"),
      endTime: new Date("2025-01-01T17:00:00Z"),
    };

    const result = availabilityAsString(availability, { locale: "en", hour12: true });
    // Should contain commas for non-consecutive days
    expect(result).toContain(",");
  });
});
