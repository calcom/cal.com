import dayjs from "@calcom/dayjs";
import { describe, expect, it, vi } from "vitest";
import {
  buildDateRanges,
  groupByDate,
  intersect,
  mergeOverlappingRanges,
  processDateOverride,
  processWorkingHours,
  subtract,
} from "./date-ranges";

describe("processWorkingHours - expanded edge cases", () => {
  it("should handle working hours across year boundary", () => {
    vi.useFakeTimers().setSystemTime(new Date("2023-12-30T00:00:00.000Z"));

    const item = {
      days: [0, 1, 2, 3, 4, 5, 6],
      startTime: new Date(Date.UTC(2023, 0, 1, 9, 0)),
      endTime: new Date(Date.UTC(2023, 0, 1, 17, 0)),
    };

    const timeZone = "UTC";
    const dateFrom = dayjs("2023-12-30T00:00:00Z");
    const dateTo = dayjs("2024-01-02T00:00:00Z");

    const results = Object.values(
      processWorkingHours({}, { item, timeZone, dateFrom, dateTo, travelSchedules: [] })
    );

    expect(results.length).toBeGreaterThanOrEqual(2);

    vi.setSystemTime(vi.getRealSystemTime());
    vi.useRealTimers();
  });

  it("should handle working hours with 23:59 end time (midnight boundary)", () => {
    vi.useFakeTimers().setSystemTime(new Date("2023-06-12T00:00:00.000Z"));

    const item = {
      days: [1, 2, 3, 4, 5],
      startTime: new Date(Date.UTC(2023, 0, 1, 22, 0)),
      endTime: new Date(Date.UTC(2023, 0, 1, 23, 59)),
    };

    const timeZone = "UTC";
    const dateFrom = dayjs("2023-06-12T00:00:00Z");
    const dateTo = dayjs("2023-06-14T00:00:00Z");

    const results = Object.values(
      processWorkingHours({}, { item, timeZone, dateFrom, dateTo, travelSchedules: [] })
    );

    // Should handle 23:59 -> midnight correctly
    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(result.end.hour()).toBe(0); // midnight
    }

    vi.setSystemTime(vi.getRealSystemTime());
    vi.useRealTimers();
  });

  it("should correctly merge overlapping working hours with same end time", () => {
    vi.useFakeTimers().setSystemTime(new Date("2023-06-12T00:00:00.000Z"));

    const item1 = {
      days: [1],
      startTime: new Date(Date.UTC(2023, 0, 1, 8, 0)),
      endTime: new Date(Date.UTC(2023, 0, 1, 12, 0)),
    };

    const item2 = {
      days: [1],
      startTime: new Date(Date.UTC(2023, 0, 1, 10, 0)),
      endTime: new Date(Date.UTC(2023, 0, 1, 12, 0)),
    };

    const timeZone = "UTC";
    const dateFrom = dayjs("2023-06-12T00:00:00Z");
    const dateTo = dayjs("2023-06-13T00:00:00Z");

    let results: Record<number, { start: typeof dayjs.prototype; end: typeof dayjs.prototype }> = {};
    results = processWorkingHours(results, {
      item: item1,
      timeZone,
      dateFrom,
      dateTo,
      travelSchedules: [],
    });
    results = processWorkingHours(results, {
      item: item2,
      timeZone,
      dateFrom,
      dateTo,
      travelSchedules: [],
    });

    const ranges = Object.values(results);
    // Should merge into a single range starting at 8:00
    expect(ranges.length).toBe(1);
    expect(ranges[0].start.hour()).toBe(8);

    vi.setSystemTime(vi.getRealSystemTime());
    vi.useRealTimers();
  });

  it("should handle no matching days in the range", () => {
    vi.useFakeTimers().setSystemTime(new Date("2023-06-12T00:00:00.000Z"));

    const item = {
      days: [6, 0], // Saturday and Sunday only
      startTime: new Date(Date.UTC(2023, 0, 1, 9, 0)),
      endTime: new Date(Date.UTC(2023, 0, 1, 17, 0)),
    };

    const timeZone = "UTC";
    // Monday to Wednesday
    const dateFrom = dayjs("2023-06-12T00:00:00Z"); // Monday
    const dateTo = dayjs("2023-06-14T00:00:00Z"); // Wednesday

    const results = Object.values(
      processWorkingHours({}, { item, timeZone, dateFrom, dateTo, travelSchedules: [] })
    );

    expect(results.length).toBe(0);

    vi.setSystemTime(vi.getRealSystemTime());
    vi.useRealTimers();
  });
});

describe("processDateOverride - expanded edge cases", () => {
  it("should handle midnight (00:00) start time override", () => {
    const item = {
      date: new Date(Date.UTC(2023, 6, 15)),
      startTime: new Date(Date.UTC(0, 0, 0, 0, 0)),
      endTime: new Date(Date.UTC(0, 0, 0, 8, 0)),
    };

    const result = processDateOverride({
      item,
      itemDateAsUtc: dayjs.utc(item.date),
      timeZone: "UTC",
      travelSchedules: [],
    });

    expect(result.start.hour()).toBe(0);
    expect(result.end.hour()).toBe(8);
  });

  it("should handle 23:59 end time override (full day)", () => {
    const item = {
      date: new Date(Date.UTC(2023, 6, 15)),
      startTime: new Date(Date.UTC(0, 0, 0, 0, 0)),
      endTime: new Date(Date.UTC(0, 0, 0, 23, 59)),
    };

    const result = processDateOverride({
      item,
      itemDateAsUtc: dayjs.utc(item.date),
      timeZone: "UTC",
      travelSchedules: [],
    });

    expect(result.start.hour()).toBe(0);
    // 23:59 should be pushed to next day midnight
    expect(result.end.date()).toBe(16);
  });

  it("should handle date override with travel schedule applied", () => {
    const item = {
      date: new Date(Date.UTC(2023, 6, 15)),
      startTime: new Date(Date.UTC(0, 0, 0, 9, 0)),
      endTime: new Date(Date.UTC(0, 0, 0, 17, 0)),
    };

    const travelSchedules = [
      {
        startDate: dayjs("2023-07-14T00:00:00Z"),
        endDate: dayjs("2023-07-16T23:59:59Z"),
        timeZone: "Asia/Tokyo",
      },
    ];

    const result = processDateOverride({
      item,
      itemDateAsUtc: dayjs.utc(item.date),
      timeZone: "America/New_York",
      travelSchedules,
    });

    // The timezone should be adjusted to Asia/Tokyo since the travel schedule covers this date
    expect(result.start.isValid()).toBe(true);
    expect(result.end.isValid()).toBe(true);
  });
});

describe("buildDateRanges - expanded edge cases", () => {
  it("should return empty date ranges when availability is empty", () => {
    const { dateRanges } = buildDateRanges({
      availability: [],
      timeZone: "UTC",
      dateFrom: dayjs("2023-06-12T00:00:00Z"),
      dateTo: dayjs("2023-06-13T00:00:00Z"),
      travelSchedules: [],
    });

    expect(dateRanges).toHaveLength(0);
  });

  it("should handle only date overrides with no working hours", () => {
    const items = [
      {
        date: new Date(Date.UTC(2023, 5, 13)),
        startTime: new Date(Date.UTC(0, 0, 0, 10, 0)),
        endTime: new Date(Date.UTC(0, 0, 0, 14, 0)),
      },
    ];

    const { dateRanges } = buildDateRanges({
      availability: items,
      timeZone: "UTC",
      dateFrom: dayjs("2023-06-12T00:00:00Z"),
      dateTo: dayjs("2023-06-14T00:00:00Z"),
      travelSchedules: [],
    });

    expect(dateRanges.length).toBe(1);
  });

  it("should exclude OOO dates from oooExcludedDateRanges but keep them in dateRanges", () => {
    const items = [
      {
        days: [1, 2, 3, 4, 5],
        startTime: new Date(Date.UTC(0, 0, 0, 9, 0)),
        endTime: new Date(Date.UTC(0, 0, 0, 17, 0)),
      },
    ];

    const outOfOffice = {
      "2023-06-13": {
        fromUser: { id: 1, displayName: "Test User" },
      },
    };

    const { dateRanges, oooExcludedDateRanges } = buildDateRanges({
      availability: items,
      timeZone: "UTC",
      dateFrom: dayjs("2023-06-12T00:00:00Z"),
      dateTo: dayjs("2023-06-15T00:00:00Z"),
      travelSchedules: [],
      outOfOffice,
    });

    // dateRanges should include all working days including the OOO day
    expect(dateRanges.length).toBeGreaterThan(oooExcludedDateRanges.length);
  });
});

describe("groupByDate", () => {
  it("should group ranges by their start date", () => {
    const ranges = [
      { start: dayjs("2023-06-12T09:00:00Z"), end: dayjs("2023-06-12T12:00:00Z") },
      { start: dayjs("2023-06-12T14:00:00Z"), end: dayjs("2023-06-12T17:00:00Z") },
      { start: dayjs("2023-06-13T09:00:00Z"), end: dayjs("2023-06-13T17:00:00Z") },
    ];

    const grouped = groupByDate(ranges);
    const keys = Object.keys(grouped);

    expect(keys).toHaveLength(2);
    expect(grouped["2023-06-12"]).toHaveLength(2);
    expect(grouped["2023-06-13"]).toHaveLength(1);
  });

  it("should return empty object for empty ranges", () => {
    const grouped = groupByDate([]);
    expect(Object.keys(grouped)).toHaveLength(0);
  });
});

describe("intersect - expanded edge cases", () => {
  it("should return empty for empty input", () => {
    expect(intersect([])).toEqual([]);
  });

  it("should return the ranges themselves for a single user", () => {
    const ranges = [
      [
        { start: dayjs("2023-06-12T09:00:00Z"), end: dayjs("2023-06-12T12:00:00Z") },
        { start: dayjs("2023-06-12T14:00:00Z"), end: dayjs("2023-06-12T17:00:00Z") },
      ],
    ];

    const result = intersect(ranges);
    expect(result).toHaveLength(2);
  });

  it("should return empty when users have no overlapping availability", () => {
    const user1 = [{ start: dayjs("2023-06-12T09:00:00Z"), end: dayjs("2023-06-12T12:00:00Z") }];
    const user2 = [{ start: dayjs("2023-06-12T14:00:00Z"), end: dayjs("2023-06-12T17:00:00Z") }];

    const result = intersect([user1, user2]);
    expect(result).toHaveLength(0);
  });

  it("should find partial overlaps correctly", () => {
    const user1 = [{ start: dayjs("2023-06-12T09:00:00Z"), end: dayjs("2023-06-12T13:00:00Z") }];
    const user2 = [{ start: dayjs("2023-06-12T11:00:00Z"), end: dayjs("2023-06-12T17:00:00Z") }];

    const result = intersect([user1, user2]);
    expect(result).toHaveLength(1);
    expect(result[0].start.format("HH:mm")).toBe("11:00");
    expect(result[0].end.format("HH:mm")).toBe("13:00");
  });

  it("should handle three users with partial overlaps", () => {
    const user1 = [{ start: dayjs("2023-06-12T08:00:00Z"), end: dayjs("2023-06-12T14:00:00Z") }];
    const user2 = [{ start: dayjs("2023-06-12T10:00:00Z"), end: dayjs("2023-06-12T16:00:00Z") }];
    const user3 = [{ start: dayjs("2023-06-12T12:00:00Z"), end: dayjs("2023-06-12T18:00:00Z") }];

    const result = intersect([user1, user2, user3]);
    expect(result).toHaveLength(1);
    expect(result[0].start.format("HH:mm")).toBe("12:00");
    expect(result[0].end.format("HH:mm")).toBe("14:00");
  });

  it("should handle exactly touching ranges (no overlap)", () => {
    const user1 = [{ start: dayjs("2023-06-12T09:00:00Z"), end: dayjs("2023-06-12T12:00:00Z") }];
    const user2 = [{ start: dayjs("2023-06-12T12:00:00Z"), end: dayjs("2023-06-12T17:00:00Z") }];

    const result = intersect([user1, user2]);
    // Touching but not overlapping should produce no result
    expect(result).toHaveLength(0);
  });
});

describe("subtract - expanded edge cases", () => {
  it("should return source ranges when no exclusions provided", () => {
    const sourceRanges = [{ start: dayjs("2023-06-12T09:00:00Z"), end: dayjs("2023-06-12T17:00:00Z") }];

    const result = subtract(sourceRanges, []);
    expect(result).toHaveLength(1);
  });

  it("should handle exclusion that completely covers source", () => {
    const sourceRanges = [{ start: dayjs("2023-06-12T10:00:00Z"), end: dayjs("2023-06-12T14:00:00Z") }];

    const excludedRanges = [{ start: dayjs("2023-06-12T08:00:00Z"), end: dayjs("2023-06-12T18:00:00Z") }];

    const result = subtract(sourceRanges, excludedRanges);
    expect(result).toHaveLength(0);
  });

  it("should handle exclusion in the middle of source", () => {
    const sourceRanges = [{ start: dayjs("2023-06-12T09:00:00Z"), end: dayjs("2023-06-12T17:00:00Z") }];

    const excludedRanges = [{ start: dayjs("2023-06-12T12:00:00Z"), end: dayjs("2023-06-12T13:00:00Z") }];

    const result = subtract(sourceRanges, excludedRanges);
    expect(result).toHaveLength(2);
    expect(result[0].end.format("HH:mm")).toBe("12:00");
    expect(result[1].start.format("HH:mm")).toBe("13:00");
  });

  it("should handle multiple exclusions splitting a single source range", () => {
    const sourceRanges = [{ start: dayjs("2023-06-12T08:00:00Z"), end: dayjs("2023-06-12T18:00:00Z") }];

    const excludedRanges = [
      { start: dayjs("2023-06-12T10:00:00Z"), end: dayjs("2023-06-12T11:00:00Z") },
      { start: dayjs("2023-06-12T14:00:00Z"), end: dayjs("2023-06-12T15:00:00Z") },
    ];

    const result = subtract(sourceRanges, excludedRanges);
    expect(result).toHaveLength(3);
  });

  it("should preserve passthrough properties on resulting ranges", () => {
    const sourceRanges = [
      {
        start: dayjs("2023-06-12T09:00:00Z"),
        end: dayjs("2023-06-12T17:00:00Z"),
        userId: 42,
      },
    ];

    const excludedRanges = [{ start: dayjs("2023-06-12T12:00:00Z"), end: dayjs("2023-06-12T13:00:00Z") }];

    const result = subtract(sourceRanges, excludedRanges);
    expect(result).toHaveLength(2);
    for (const range of result) {
      expect(range).toHaveProperty("userId", 42);
    }
  });
});

describe("mergeOverlappingRanges - expanded edge cases", () => {
  it("should return empty array for empty input", () => {
    expect(mergeOverlappingRanges([])).toEqual([]);
  });

  it("should return single range unchanged", () => {
    const ranges = [{ start: new Date("2023-06-12T09:00:00Z"), end: new Date("2023-06-12T17:00:00Z") }];
    const result = mergeOverlappingRanges(ranges);
    expect(result).toHaveLength(1);
  });

  it("should merge two overlapping ranges", () => {
    const ranges = [
      { start: new Date("2023-06-12T09:00:00Z"), end: new Date("2023-06-12T13:00:00Z") },
      { start: new Date("2023-06-12T12:00:00Z"), end: new Date("2023-06-12T17:00:00Z") },
    ];

    const result = mergeOverlappingRanges(ranges);
    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toBe("2023-06-12T09:00:00.000Z");
    expect(result[0].end.toISOString()).toBe("2023-06-12T17:00:00.000Z");
  });

  it("should merge exactly touching ranges", () => {
    const ranges = [
      { start: new Date("2023-06-12T09:00:00Z"), end: new Date("2023-06-12T12:00:00Z") },
      { start: new Date("2023-06-12T12:00:00Z"), end: new Date("2023-06-12T17:00:00Z") },
    ];

    const result = mergeOverlappingRanges(ranges);
    expect(result).toHaveLength(1);
  });

  it("should not merge non-overlapping ranges", () => {
    const ranges = [
      { start: new Date("2023-06-12T09:00:00Z"), end: new Date("2023-06-12T11:00:00Z") },
      { start: new Date("2023-06-12T14:00:00Z"), end: new Date("2023-06-12T17:00:00Z") },
    ];

    const result = mergeOverlappingRanges(ranges);
    expect(result).toHaveLength(2);
  });

  it("should handle unsorted input by sorting first", () => {
    const ranges = [
      { start: new Date("2023-06-12T14:00:00Z"), end: new Date("2023-06-12T17:00:00Z") },
      { start: new Date("2023-06-12T09:00:00Z"), end: new Date("2023-06-12T15:00:00Z") },
    ];

    const result = mergeOverlappingRanges(ranges);
    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toBe("2023-06-12T09:00:00.000Z");
    expect(result[0].end.toISOString()).toBe("2023-06-12T17:00:00.000Z");
  });

  it("should merge multiple consecutive overlapping ranges into one", () => {
    const ranges = [
      { start: new Date("2023-06-12T08:00:00Z"), end: new Date("2023-06-12T10:00:00Z") },
      { start: new Date("2023-06-12T09:00:00Z"), end: new Date("2023-06-12T12:00:00Z") },
      { start: new Date("2023-06-12T11:00:00Z"), end: new Date("2023-06-12T14:00:00Z") },
      { start: new Date("2023-06-12T13:00:00Z"), end: new Date("2023-06-12T17:00:00Z") },
    ];

    const result = mergeOverlappingRanges(ranges);
    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toBe("2023-06-12T08:00:00.000Z");
    expect(result[0].end.toISOString()).toBe("2023-06-12T17:00:00.000Z");
  });
});
