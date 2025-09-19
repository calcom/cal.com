import { describe, it, expect } from "vitest";

import { ColumnFilterType, type ColumnFilter } from "@calcom/features/data-table/lib/types";

import { extractDateRangeFromColumnFilters, replaceDateRangeColumnFilter } from "../bookingUtils";

describe("extractDateRangeFromColumnFilters", () => {
  const mockStartTimeFilter: ColumnFilter = {
    id: "startTime",
    value: {
      type: ColumnFilterType.DATE_RANGE,
      data: {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        preset: "thisMonth",
      },
    },
  };

  const mockCreatedAtFilter: ColumnFilter = {
    id: "createdAt",
    value: {
      type: ColumnFilterType.DATE_RANGE,
      data: {
        startDate: "2024-02-01T00:00:00.000Z",
        endDate: "2024-02-29T23:59:59.999Z",
        preset: "lastMonth",
      },
    },
  };

  const mockTextFilter: ColumnFilter = {
    id: "status",
    value: {
      type: ColumnFilterType.TEXT,
      data: {
        operator: "equals" as const,
        operand: "confirmed",
      },
    },
  };

  const mockSingleSelectFilter: ColumnFilter = {
    id: "eventType",
    value: {
      type: ColumnFilterType.SINGLE_SELECT,
      data: "meeting",
    },
  };

  describe("successful extraction", () => {
    it("should extract date range from startTime filter", () => {
      const result = extractDateRangeFromColumnFilters([mockStartTimeFilter, mockTextFilter]);

      expect(result).toEqual({
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        dateTarget: "startTime",
      });
    });

    it("should extract date range from createdAt filter", () => {
      const result = extractDateRangeFromColumnFilters([mockCreatedAtFilter, mockSingleSelectFilter]);

      expect(result).toEqual({
        startDate: "2024-02-01T00:00:00.000Z",
        endDate: "2024-02-29T23:59:59.999Z",
        dateTarget: "createdAt",
      });
    });

    it("should find startTime filter when it comes after other filters", () => {
      const result = extractDateRangeFromColumnFilters([
        mockTextFilter,
        mockStartTimeFilter,
        mockSingleSelectFilter,
      ]);

      expect(result).toEqual({
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        dateTarget: "startTime",
      });
    });

    it("should ignore non-date-range filters", () => {
      const result = extractDateRangeFromColumnFilters([
        mockTextFilter,
        mockSingleSelectFilter,
        mockStartTimeFilter,
      ]);

      expect(result).toEqual({
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        dateTarget: "startTime",
      });
    });
  });

  describe("error cases", () => {
    it("should throw error when no column filters provided", () => {
      expect(() => extractDateRangeFromColumnFilters()).toThrow("No date range filter found");
    });

    it("should throw error when column filters is undefined", () => {
      expect(() => extractDateRangeFromColumnFilters(undefined)).toThrow("No date range filter found");
    });

    it("should handle empty column filters array", () => {
      expect(() => extractDateRangeFromColumnFilters([])).toThrow("No date range filter found");
    });

    it("should throw error when no date range filters exist", () => {
      expect(() => extractDateRangeFromColumnFilters([mockTextFilter, mockSingleSelectFilter])).toThrow(
        "No date range filter found"
      );
    });

    it("should throw error when date range filter has missing startDate", () => {
      const filterWithMissingStartDate: ColumnFilter = {
        id: "startTime",
        value: {
          type: ColumnFilterType.DATE_RANGE,
          data: {
            startDate: null,
            endDate: "2024-01-31T23:59:59.999Z",
            preset: "thisMonth",
          },
        },
      };

      expect(() => extractDateRangeFromColumnFilters([filterWithMissingStartDate])).toThrow(
        "No date range filter found"
      );
    });

    it("should throw error when date range filter has missing endDate", () => {
      const filterWithMissingEndDate: ColumnFilter = {
        id: "createdAt",
        value: {
          type: ColumnFilterType.DATE_RANGE,
          data: {
            startDate: "2024-01-01T00:00:00.000Z",
            endDate: null,
            preset: "thisMonth",
          },
        },
      };

      expect(() => extractDateRangeFromColumnFilters([filterWithMissingEndDate])).toThrow(
        "No date range filter found"
      );
    });

    it("should throw error when date range filter has both dates missing", () => {
      const filterWithMissingDates: ColumnFilter = {
        id: "startTime",
        value: {
          type: ColumnFilterType.DATE_RANGE,
          data: {
            startDate: null,
            endDate: null,
            preset: "thisMonth",
          },
        },
      };

      expect(() => extractDateRangeFromColumnFilters([filterWithMissingDates])).toThrow(
        "No date range filter found"
      );
    });

    it("should throw error when startTime/createdAt filter is not DATE_RANGE type", () => {
      const invalidStartTimeFilter: ColumnFilter = {
        id: "startTime",
        value: {
          type: ColumnFilterType.TEXT,
          data: {
            operator: "equals" as const,
            operand: "some-date",
          },
        },
      };

      expect(() => extractDateRangeFromColumnFilters([invalidStartTimeFilter])).toThrow(
        "No date range filter found"
      );
    });
  });

  describe("edge cases", () => {
    it("should work with only one date range filter among many others", () => {
      const numberFilter: ColumnFilter = {
        id: "number-filter",
        value: {
          type: ColumnFilterType.NUMBER,
          data: { operator: "gt" as const, operand: 5 },
        },
      };

      const anotherTextFilter: ColumnFilter = {
        id: "another-text",
        value: {
          type: ColumnFilterType.TEXT,
          data: { operator: "contains" as const, operand: "test" },
        },
      };

      const manyFilters = [
        mockTextFilter,
        mockSingleSelectFilter,
        anotherTextFilter,
        mockStartTimeFilter,
        numberFilter,
      ];

      const result = extractDateRangeFromColumnFilters(manyFilters);

      expect(result).toEqual({
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        dateTarget: "startTime",
      });
    });
  });
});

describe("replaceDateRangeColumnFilter", () => {
  const mockStartTimeFilter: ColumnFilter = {
    id: "startTime",
    value: {
      type: ColumnFilterType.DATE_RANGE,
      data: {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        preset: "thisMonth",
      },
    },
  };

  const mockCreatedAtFilter: ColumnFilter = {
    id: "createdAt",
    value: {
      type: ColumnFilterType.DATE_RANGE,
      data: {
        startDate: "2024-02-01T00:00:00.000Z",
        endDate: "2024-02-29T23:59:59.999Z",
        preset: "lastMonth",
      },
    },
  };

  const mockTextFilter: ColumnFilter = {
    id: "status",
    value: {
      type: ColumnFilterType.TEXT,
      data: {
        operator: "equals" as const,
        operand: "confirmed",
      },
    },
  };

  const mockSingleSelectFilter: ColumnFilter = {
    id: "eventType",
    value: {
      type: ColumnFilterType.SINGLE_SELECT,
      data: "meeting",
    },
  };

  const newStartDate = "2024-03-01T00:00:00.000Z";
  const newEndDate = "2024-03-31T23:59:59.999Z";

  describe("successful replacement", () => {
    it("should replace startTime filter with new dates", () => {
      const columnFilters = [mockStartTimeFilter, mockTextFilter];

      const result = replaceDateRangeColumnFilter({
        columnFilters,
        newStartDate,
        newEndDate,
      });

      expect(result).toEqual([
        {
          id: "startTime",
          value: {
            type: ColumnFilterType.DATE_RANGE,
            data: {
              startDate: newStartDate,
              endDate: newEndDate,
              preset: "thisMonth", // Preserves original preset
            },
          },
        },
        mockTextFilter, // Non-date filters remain unchanged
      ]);
    });

    it("should replace createdAt filter with new dates", () => {
      const columnFilters = [mockCreatedAtFilter, mockSingleSelectFilter];

      const result = replaceDateRangeColumnFilter({
        columnFilters,
        newStartDate,
        newEndDate,
      });

      expect(result).toEqual([
        {
          id: "createdAt",
          value: {
            type: ColumnFilterType.DATE_RANGE,
            data: {
              startDate: newStartDate,
              endDate: newEndDate,
              preset: "lastMonth", // Preserves original preset
            },
          },
        },
        mockSingleSelectFilter, // Non-date filters remain unchanged
      ]);
    });

    it("should preserve preset value when replacing filter", () => {
      const customPresetFilter: ColumnFilter = {
        id: "startTime",
        value: {
          type: ColumnFilterType.DATE_RANGE,
          data: {
            startDate: "2024-01-01T00:00:00.000Z",
            endDate: "2024-01-31T23:59:59.999Z",
            preset: "customPreset",
          },
        },
      };

      const result = replaceDateRangeColumnFilter({
        columnFilters: [customPresetFilter],
        newStartDate,
        newEndDate,
      });

      expect(result![0].value).toMatchObject({
        data: expect.objectContaining({
          preset: "customPreset",
        }),
      });
    });

    it("should leave non-date-range filters unchanged", () => {
      const columnFilters = [mockTextFilter, mockSingleSelectFilter, mockStartTimeFilter];

      const result = replaceDateRangeColumnFilter({
        columnFilters,
        newStartDate,
        newEndDate,
      });

      expect(result).toEqual([
        mockTextFilter, // Unchanged
        mockSingleSelectFilter, // Unchanged
        {
          id: "startTime",
          value: {
            type: ColumnFilterType.DATE_RANGE,
            data: {
              startDate: newStartDate,
              endDate: newEndDate,
              preset: "thisMonth",
            },
          },
        },
      ]);
    });

    it("should handle startTime filter replacement among other filters", () => {
      const columnFilters = [mockTextFilter, mockStartTimeFilter, mockSingleSelectFilter];

      const result = replaceDateRangeColumnFilter({
        columnFilters,
        newStartDate,
        newEndDate,
      });

      expect(result).toEqual([
        mockTextFilter, // Unchanged
        {
          id: "startTime",
          value: {
            type: ColumnFilterType.DATE_RANGE,
            data: {
              startDate: newStartDate,
              endDate: newEndDate,
              preset: "thisMonth",
            },
          },
        },
        mockSingleSelectFilter, // Unchanged
      ]);
    });

    it("should maintain filter structure when replacing", () => {
      const result = replaceDateRangeColumnFilter({
        columnFilters: [mockStartTimeFilter],
        newStartDate,
        newEndDate,
      });

      expect(result?.[0]).toHaveProperty("id");
      expect(result?.[0]).toHaveProperty("value");
      expect(result?.[0].value).toHaveProperty("type", ColumnFilterType.DATE_RANGE);
      expect(result?.[0].value).toHaveProperty("data");
      expect(result?.[0].value.data).toHaveProperty("startDate");
      expect(result?.[0].value.data).toHaveProperty("endDate");
      expect(result?.[0].value.data).toHaveProperty("preset");
    });
  });

  describe("edge cases", () => {
    it("should return undefined when no column filters provided", () => {
      const result = replaceDateRangeColumnFilter({
        columnFilters: undefined,
        newStartDate,
        newEndDate,
      });

      expect(result).toBeUndefined();
    });

    it("should handle empty column filters array", () => {
      const result = replaceDateRangeColumnFilter({
        columnFilters: [],
        newStartDate,
        newEndDate,
      });

      expect(result).toEqual([]);
    });

    it("should return unchanged filters when no date range filters exist", () => {
      const columnFilters = [mockTextFilter, mockSingleSelectFilter];

      const result = replaceDateRangeColumnFilter({
        columnFilters,
        newStartDate,
        newEndDate,
      });

      expect(result).toEqual(columnFilters);
    });

    it("should not modify filters with startTime/createdAt id but wrong type", () => {
      const invalidStartTimeFilter: ColumnFilter = {
        id: "startTime",
        value: {
          type: ColumnFilterType.TEXT,
          data: {
            operator: "equals" as const,
            operand: "some-date",
          },
        },
      };

      const result = replaceDateRangeColumnFilter({
        columnFilters: [invalidStartTimeFilter],
        newStartDate,
        newEndDate,
      });

      expect(result).toEqual([invalidStartTimeFilter]); // Should remain unchanged
    });

    it("should handle filters with similar but different ids", () => {
      const similarIdFilter: ColumnFilter = {
        id: "startTimeRange", // Similar but not exact match
        value: {
          type: ColumnFilterType.DATE_RANGE,
          data: {
            startDate: "2024-01-01T00:00:00.000Z",
            endDate: "2024-01-31T23:59:59.999Z",
            preset: "thisMonth",
          },
        },
      };

      const result = replaceDateRangeColumnFilter({
        columnFilters: [similarIdFilter],
        newStartDate,
        newEndDate,
      });

      expect(result).toEqual([similarIdFilter]); // Should remain unchanged
    });

    it("should handle mixed case scenarios", () => {
      const invalidStartTimeTextFilter: ColumnFilter = {
        id: "startTime",
        value: {
          type: ColumnFilterType.TEXT, // Wrong type, should be ignored
          data: { operator: "equals" as const, operand: "test" },
        },
      };

      const mixedFilters = [
        mockTextFilter,
        invalidStartTimeTextFilter,
        mockCreatedAtFilter, // Valid date range filter
        mockSingleSelectFilter,
      ];

      const result = replaceDateRangeColumnFilter({
        columnFilters: mixedFilters,
        newStartDate,
        newEndDate,
      });

      expect(result).toEqual([
        mockTextFilter, // Unchanged
        invalidStartTimeTextFilter, // Unchanged (wrong type)
        {
          id: "createdAt",
          value: {
            type: ColumnFilterType.DATE_RANGE,
            data: {
              startDate: newStartDate,
              endDate: newEndDate,
              preset: "lastMonth", // Replaced
            },
          },
        },
        mockSingleSelectFilter, // Unchanged
      ]);
    });
  });
});
