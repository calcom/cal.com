import { describe, expect, it } from "vitest";

import { ColumnFilterType } from "@calcom/features/data-table";
import type { ActiveFilters } from "@calcom/features/data-table";

import { createActiveFiltersValidator, type AccessibleResources } from "./useActiveFiltersValidator";

describe("createActiveFiltersValidator", () => {
  const defaultAccessibleResources: AccessibleResources = {
    userIds: [1, 2, 3],
    eventTypeIds: [10, 20, 30],
    teamIds: [100, 200, 300],
  };

  describe("userId filter validation", () => {
    it("keeps valid user IDs in multi-select filter", () => {
      const validator = createActiveFiltersValidator(defaultAccessibleResources);
      const filters: ActiveFilters = [
        {
          f: "userId",
          v: {
            type: ColumnFilterType.MULTI_SELECT,
            data: [1, 2, 999],
          },
        },
      ];

      const result = validator(filters);

      expect(result).toHaveLength(1);
      expect(result[0].f).toBe("userId");
      expect(result[0].v).toEqual({
        type: ColumnFilterType.MULTI_SELECT,
        data: [1, 2],
      });
    });

    it("removes filter when all user IDs are invalid in multi-select", () => {
      const validator = createActiveFiltersValidator(defaultAccessibleResources);
      const filters: ActiveFilters = [
        {
          f: "userId",
          v: {
            type: ColumnFilterType.MULTI_SELECT,
            data: [999, 888],
          },
        },
      ];

      const result = validator(filters);

      expect(result).toHaveLength(0);
    });
  });

  describe("eventTypeId filter validation", () => {
    it("keeps valid event type IDs in multi-select filter", () => {
      const validator = createActiveFiltersValidator(defaultAccessibleResources);
      const filters: ActiveFilters = [
        {
          f: "eventTypeId",
          v: {
            type: ColumnFilterType.MULTI_SELECT,
            data: [10, 20, 999],
          },
        },
      ];

      const result = validator(filters);

      expect(result).toHaveLength(1);
      expect(result[0].f).toBe("eventTypeId");
      expect(result[0].v).toEqual({
        type: ColumnFilterType.MULTI_SELECT,
        data: [10, 20],
      });
    });

    it("removes filter when all event type IDs are invalid in multi-select", () => {
      const validator = createActiveFiltersValidator(defaultAccessibleResources);
      const filters: ActiveFilters = [
        {
          f: "eventTypeId",
          v: {
            type: ColumnFilterType.MULTI_SELECT,
            data: [999, 888],
          },
        },
      ];

      const result = validator(filters);

      expect(result).toHaveLength(0);
    });
  });

  describe("teamId filter validation", () => {
    it("keeps valid team IDs in multi-select filter", () => {
      const validator = createActiveFiltersValidator(defaultAccessibleResources);
      const filters: ActiveFilters = [
        {
          f: "teamId",
          v: {
            type: ColumnFilterType.MULTI_SELECT,
            data: [100, 200, 999],
          },
        },
      ];

      const result = validator(filters);

      expect(result).toHaveLength(1);
      expect(result[0].f).toBe("teamId");
      expect(result[0].v).toEqual({
        type: ColumnFilterType.MULTI_SELECT,
        data: [100, 200],
      });
    });

    it("removes filter when all team IDs are invalid in multi-select", () => {
      const validator = createActiveFiltersValidator(defaultAccessibleResources);
      const filters: ActiveFilters = [
        {
          f: "teamId",
          v: {
            type: ColumnFilterType.MULTI_SELECT,
            data: [999, 888],
          },
        },
      ];

      const result = validator(filters);

      expect(result).toHaveLength(0);
    });
  });

  describe("utm filters", () => {
    it("preserves utmSource filter unchanged", () => {
      const validator = createActiveFiltersValidator(defaultAccessibleResources);
      const filters: ActiveFilters = [
        {
          f: "utmSource",
          v: {
            type: ColumnFilterType.TEXT,
            data: { operator: "contains", operand: "google" },
          },
        },
      ];

      const result = validator(filters);

      expect(result).toHaveLength(1);
      expect(result[0].f).toBe("utmSource");
      expect(result[0].v).toEqual({
        type: ColumnFilterType.TEXT,
        data: { operator: "contains", operand: "google" },
      });
    });

    it("preserves all five UTM filters unchanged", () => {
      const validator = createActiveFiltersValidator(defaultAccessibleResources);
      const filters: ActiveFilters = [
        { f: "utmSource", v: { type: ColumnFilterType.TEXT, data: { operator: "contains", operand: "google" } } },
        { f: "utmMedium", v: { type: ColumnFilterType.TEXT, data: { operator: "equals", operand: "cpc" } } },
        { f: "utmCampaign", v: { type: ColumnFilterType.TEXT, data: { operator: "startsWith", operand: "spring" } } },
        { f: "utmTerm", v: { type: ColumnFilterType.TEXT, data: { operator: "contains", operand: "booking" } } },
        { f: "utmContent", v: { type: ColumnFilterType.TEXT, data: { operator: "endsWith", operand: "banner" } } },
      ];

      const result = validator(filters);

      expect(result).toHaveLength(5);
      expect(result.map((f) => f.f)).toEqual([
        "utmSource",
        "utmMedium",
        "utmCampaign",
        "utmTerm",
        "utmContent",
      ]);
    });

    it("preserves UTM filters alongside validated ID filters", () => {
      const validator = createActiveFiltersValidator(defaultAccessibleResources);
      const filters: ActiveFilters = [
        {
          f: "userId",
          v: { type: ColumnFilterType.MULTI_SELECT, data: [1, 999] },
        },
        {
          f: "utmSource",
          v: { type: ColumnFilterType.TEXT, data: { operator: "contains", operand: "google" } },
        },
      ];

      const result = validator(filters);

      // userId is trimmed to valid IDs; utmSource passes through unchanged
      expect(result).toHaveLength(2);
      expect(result[0].f).toBe("userId");
      expect(result[0].v).toEqual({ type: ColumnFilterType.MULTI_SELECT, data: [1] });
      expect(result[1].f).toBe("utmSource");
      expect(result[1].v).toEqual({
        type: ColumnFilterType.TEXT,
        data: { operator: "contains", operand: "google" },
      });
    });
  });

  describe("other filters", () => {
    it("preserves filters that are not userId, eventTypeId, or teamId", () => {
      const validator = createActiveFiltersValidator(defaultAccessibleResources);
      const filters: ActiveFilters = [
        {
          f: "status",
          v: {
            type: ColumnFilterType.SINGLE_SELECT,
            data: "confirmed",
          },
        },
        {
          f: "attendeeName",
          v: {
            type: ColumnFilterType.TEXT,
            data: {
              operator: "contains",
              operand: "John",
            },
          },
        },
      ];

      const result = validator(filters);

      expect(result).toHaveLength(2);
      expect(result[0].f).toBe("status");
      expect(result[1].f).toBe("attendeeName");
    });

    it("preserves filters without a value", () => {
      const validator = createActiveFiltersValidator(defaultAccessibleResources);
      const filters: ActiveFilters = [
        {
          f: "userId",
          v: undefined,
        },
      ];

      const result = validator(filters);

      expect(result).toHaveLength(1);
      expect(result[0].f).toBe("userId");
      expect(result[0].v).toBeUndefined();
    });
  });

  describe("mixed filters", () => {
    it("validates multiple filters correctly", () => {
      const validator = createActiveFiltersValidator(defaultAccessibleResources);
      const filters: ActiveFilters = [
        {
          f: "userId",
          v: {
            type: ColumnFilterType.MULTI_SELECT,
            data: [1, 999],
          },
        },
        {
          f: "eventTypeId",
          v: {
            type: ColumnFilterType.MULTI_SELECT,
            data: [888],
          },
        },
        {
          f: "teamId",
          v: {
            type: ColumnFilterType.MULTI_SELECT,
            data: [100, 999],
          },
        },
        {
          f: "status",
          v: {
            type: ColumnFilterType.SINGLE_SELECT,
            data: "confirmed",
          },
        },
      ];

      const result = validator(filters);

      expect(result).toHaveLength(3);
      expect(result[0].f).toBe("userId");
      expect(result[0].v).toEqual({
        type: ColumnFilterType.MULTI_SELECT,
        data: [1],
      });
      expect(result[1].f).toBe("teamId");
      expect(result[1].v).toEqual({
        type: ColumnFilterType.MULTI_SELECT,
        data: [100],
      });
      expect(result[2].f).toBe("status");
    });
  });

  describe("empty accessible resources", () => {
    it("removes all ID-based filters when no resources are accessible", () => {
      const validator = createActiveFiltersValidator({
        userIds: [],
        eventTypeIds: [],
        teamIds: [],
      });
      const filters: ActiveFilters = [
        {
          f: "userId",
          v: {
            type: ColumnFilterType.MULTI_SELECT,
            data: [1, 2],
          },
        },
        {
          f: "eventTypeId",
          v: {
            type: ColumnFilterType.MULTI_SELECT,
            data: [10],
          },
        },
        {
          f: "status",
          v: {
            type: ColumnFilterType.SINGLE_SELECT,
            data: "confirmed",
          },
        },
      ];

      const result = validator(filters);

      expect(result).toHaveLength(1);
      expect(result[0].f).toBe("status");
    });
  });
});
