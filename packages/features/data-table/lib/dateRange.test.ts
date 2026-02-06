import { describe, expect, it, vi } from "vitest";

import dayjs from "@calcom/dayjs";

import {
  getDateRangeFromPreset,
  recalculateDateRange,
  getCompatiblePresets,
  PRESET_OPTIONS,
  CUSTOM_PRESET,
  DEFAULT_PRESET,
  CUSTOM_PRESET_VALUE,
} from "./dateRange";
import { ColumnFilterType, type DateRangeFilterValue } from "./types";

// Mock dayjs to have consistent timestamps in tests
vi.mock("@calcom/dayjs", () => {
  const mockDayjs = vi.fn(() => ({
    startOf: vi.fn().mockReturnThis(),
    endOf: vi.fn().mockReturnThis(),
    subtract: vi.fn().mockReturnThis(),
    toISOString: vi.fn().mockReturnValue("2024-03-20T00:00:00.000Z"),
  }));
  return {
    default: mockDayjs,
  };
});

describe("getDateRangeFromPreset", () => {
  it("should return default dates for null value", () => {
    const result = getDateRangeFromPreset(null);
    expect(result.preset).toEqual(CUSTOM_PRESET);
    expect(dayjs).toHaveBeenCalled();
  });

  it("should return today's date range for 'tdy' preset", () => {
    const result = getDateRangeFromPreset("tdy");
    expect(result.preset.value).toBe("tdy");
    expect(dayjs).toHaveBeenCalled();
  });

  it("should return last 7 days range for 'w' preset", () => {
    const result = getDateRangeFromPreset("w");
    expect(result.preset.value).toBe("w");
    expect(dayjs).toHaveBeenCalled();
  });

  it("should return last 30 days range for 't' preset", () => {
    const result = getDateRangeFromPreset("t");
    expect(result.preset.value).toBe("t");
    expect(dayjs).toHaveBeenCalled();
  });

  it("should return month to date range for 'm' preset", () => {
    const result = getDateRangeFromPreset("m");
    expect(result.preset.value).toBe("m");
    expect(dayjs).toHaveBeenCalled();
  });

  it("should return year to date range for 'y' preset", () => {
    const result = getDateRangeFromPreset("y");
    expect(result.preset.value).toBe("y");
    expect(dayjs).toHaveBeenCalled();
  });
});

describe("recalculateDateRange", () => {
  it("should return custom range as is", () => {
    const customFilter: DateRangeFilterValue = {
      type: ColumnFilterType.DATE_RANGE,
      data: {
        preset: CUSTOM_PRESET_VALUE,
        startDate: "2024-03-01T00:00:00.000Z",
        endDate: "2024-03-15T00:00:00.000Z",
      },
    };

    const result = recalculateDateRange(customFilter);
    expect(result).toEqual(customFilter);
  });

  it("should recalculate dates for non-custom presets", () => {
    const filter: DateRangeFilterValue = {
      type: ColumnFilterType.DATE_RANGE,
      data: {
        preset: "w",
        startDate: "2024-03-01T00:00:00.000Z",
        endDate: "2024-03-15T00:00:00.000Z",
      },
    };

    const result = recalculateDateRange(filter);
    expect(result.type).toBe(ColumnFilterType.DATE_RANGE);
    expect(result.data.preset).toBe("w");
    expect(result.data.startDate).toBe("2024-03-20T00:00:00.000Z");
    expect(result.data.endDate).toBe("2024-03-20T00:00:00.000Z");
  });
});

describe("PRESET_OPTIONS", () => {
  it("should contain all expected preset options", () => {
    const expectedValues = ["tdy", "w", "t", "m", "y", "c"];
    expect(PRESET_OPTIONS.map((o) => o.value)).toEqual(expectedValues);
  });

  it("should have correct default preset", () => {
    expect(DEFAULT_PRESET.value).toBe("w");
    expect(DEFAULT_PRESET.i18nOptions).toEqual({ count: 7 });
  });

  it("should have correct custom preset", () => {
    expect(CUSTOM_PRESET.value).toBe(CUSTOM_PRESET_VALUE);
    expect(CUSTOM_PRESET.labelKey).toBe("custom_range");
  });

  it("should have correct direction for each preset", () => {
    expect(PRESET_OPTIONS[0].direction).toBe("past"); // Today
    expect(PRESET_OPTIONS[1].direction).toBe("past"); // Last 7 days
    expect(PRESET_OPTIONS[2].direction).toBe("past"); // Last 30 days
    expect(PRESET_OPTIONS[3].direction).toBe("past"); // Month to date
    expect(PRESET_OPTIONS[4].direction).toBe("past"); // Year to date
    expect(PRESET_OPTIONS[5].direction).toBe("any"); // Custom
  });
});

describe("getCompatiblePresets", () => {
  it("should return empty array for customOnly range", () => {
    const result = getCompatiblePresets("customOnly");
    expect(result).toEqual([]);
  });

  it("should return all presets for any range", () => {
    const result = getCompatiblePresets("any");
    expect(result.length).toBe(6); // All 6 presets
    expect(result.map((p) => p.value)).toEqual(["tdy", "w", "t", "m", "y", "c"]);
  });

  it("should return all presets for past range (including direction:any)", () => {
    const result = getCompatiblePresets("past");
    expect(result.length).toBe(6); // All 6 presets (5 past + 1 any)
    // Should include both "past" direction and "any" direction presets
    const directions = result.map((p) => p.direction);
    expect(directions).toContain("past");
    expect(directions).toContain("any");
    expect(result.map((p) => p.value)).toEqual(["tdy", "w", "t", "m", "y", "c"]);
  });

  it("should return only any-direction presets for future range", () => {
    const result = getCompatiblePresets("future");
    expect(result.length).toBe(1); // Only Custom (Today is now past-direction)
    expect(result.map((p) => p.value)).toEqual(["c"]);
    // All returned presets should have direction "any"
    expect(result.every((p) => p.direction === "any")).toBe(true);
  });

  it("should not return past-only presets for future range", () => {
    const result = getCompatiblePresets("future");
    const values = result.map((p) => p.value);
    // Should NOT include past-only presets (including Today)
    expect(values).not.toContain("tdy"); // Today (now past-direction)
    expect(values).not.toContain("w"); // Last 7 days
    expect(values).not.toContain("t"); // Last 30 days
    expect(values).not.toContain("m"); // Month to date
    expect(values).not.toContain("y"); // Year to date
  });
});
