import { describe, expect, it } from "vitest";

import {
  buildMonthlyProrationMetadata,
  findMonthlyProrationLineItem,
  MONTHLY_PRORATION_METADATA_TYPE,
} from "./proration-utils";

describe("proration-utils", () => {
  describe("buildMonthlyProrationMetadata", () => {
    it("should build metadata with only prorationId when no optional params", () => {
      const result = buildMonthlyProrationMetadata({
        prorationId: "proration-123",
      });

      expect(result).toEqual({
        type: MONTHLY_PRORATION_METADATA_TYPE,
        prorationId: "proration-123",
      });
    });

    it("should include teamId when provided", () => {
      const result = buildMonthlyProrationMetadata({
        prorationId: "proration-123",
        teamId: 456,
      });

      expect(result).toEqual({
        type: MONTHLY_PRORATION_METADATA_TYPE,
        prorationId: "proration-123",
        teamId: "456",
      });
    });

    it("should include monthKey when provided", () => {
      const result = buildMonthlyProrationMetadata({
        prorationId: "proration-123",
        monthKey: "2023-12",
      });

      expect(result).toEqual({
        type: MONTHLY_PRORATION_METADATA_TYPE,
        prorationId: "proration-123",
        monthKey: "2023-12",
      });
    });

    it("should include all optional params when provided", () => {
      const result = buildMonthlyProrationMetadata({
        prorationId: "proration-123",
        teamId: 789,
        monthKey: "2024-01",
      });

      expect(result).toEqual({
        type: MONTHLY_PRORATION_METADATA_TYPE,
        prorationId: "proration-123",
        teamId: "789",
        monthKey: "2024-01",
      });
    });

    it("should convert teamId to string when it's zero", () => {
      const result = buildMonthlyProrationMetadata({
        prorationId: "proration-123",
        teamId: 0,
      });

      expect(result).toEqual({
        type: MONTHLY_PRORATION_METADATA_TYPE,
        prorationId: "proration-123",
        teamId: "0",
      });
    });

    it("should not include teamId when undefined", () => {
      const result = buildMonthlyProrationMetadata({
        prorationId: "proration-123",
        teamId: undefined,
      });

      expect(result).toEqual({
        type: MONTHLY_PRORATION_METADATA_TYPE,
        prorationId: "proration-123",
      });
    });

    it("should not include monthKey when undefined", () => {
      const result = buildMonthlyProrationMetadata({
        prorationId: "proration-123",
        monthKey: undefined,
      });

      expect(result).toEqual({
        type: MONTHLY_PRORATION_METADATA_TYPE,
        prorationId: "proration-123",
      });
    });

    it("should not include monthKey when empty string", () => {
      const result = buildMonthlyProrationMetadata({
        prorationId: "proration-123",
        monthKey: "",
      });

      expect(result).toEqual({
        type: MONTHLY_PRORATION_METADATA_TYPE,
        prorationId: "proration-123",
      });
    });
  });

  describe("findMonthlyProrationLineItem", () => {
    it("should find line item with monthly proration metadata type", () => {
      const lineItems = [
        {
          id: "item-1",
          metadata: { type: "other_type", data: "value1" },
        },
        {
          id: "item-2",
          metadata: { type: MONTHLY_PRORATION_METADATA_TYPE, prorationId: "proration-123" },
        },
        {
          id: "item-3",
          metadata: { type: "another_type", data: "value2" },
        },
      ];

      const result = findMonthlyProrationLineItem(lineItems);

      expect(result).toEqual({
        id: "item-2",
        metadata: { type: MONTHLY_PRORATION_METADATA_TYPE, prorationId: "proration-123" },
      });
    });

    it("should return undefined when no matching line item", () => {
      const lineItems = [
        {
          id: "item-1",
          metadata: { type: "other_type", data: "value1" },
        },
        {
          id: "item-2",
          metadata: { type: "another_type", data: "value2" },
        },
      ];

      const result = findMonthlyProrationLineItem(lineItems);

      expect(result).toBeUndefined();
    });

    it("should return undefined when line items array is empty", () => {
      const result = findMonthlyProrationLineItem([]);

      expect(result).toBeUndefined();
    });

    it("should return first matching item when multiple matches", () => {
      const lineItems = [
        {
          id: "item-1",
          metadata: { type: MONTHLY_PRORATION_METADATA_TYPE, prorationId: "proration-111" },
        },
        {
          id: "item-2",
          metadata: { type: MONTHLY_PRORATION_METADATA_TYPE, prorationId: "proration-222" },
        },
      ];

      const result = findMonthlyProrationLineItem(lineItems);

      expect(result).toEqual({
        id: "item-1",
        metadata: { type: MONTHLY_PRORATION_METADATA_TYPE, prorationId: "proration-111" },
      });
    });

    it("should handle line items with null metadata", () => {
      const lineItems = [
        {
          id: "item-1",
          metadata: null,
        },
        {
          id: "item-2",
          metadata: { type: MONTHLY_PRORATION_METADATA_TYPE, prorationId: "proration-123" },
        },
      ];

      const result = findMonthlyProrationLineItem(lineItems);

      expect(result).toEqual({
        id: "item-2",
        metadata: { type: MONTHLY_PRORATION_METADATA_TYPE, prorationId: "proration-123" },
      });
    });

    it("should handle line items with undefined metadata", () => {
      const lineItems = [
        {
          id: "item-1",
          metadata: undefined,
        },
        {
          id: "item-2",
          metadata: { type: MONTHLY_PRORATION_METADATA_TYPE, prorationId: "proration-123" },
        },
      ];

      const result = findMonthlyProrationLineItem(lineItems);

      expect(result).toEqual({
        id: "item-2",
        metadata: { type: MONTHLY_PRORATION_METADATA_TYPE, prorationId: "proration-123" },
      });
    });

    it("should handle line items with empty metadata object", () => {
      const lineItems = [
        {
          id: "item-1",
          metadata: {},
        },
        {
          id: "item-2",
          metadata: { type: MONTHLY_PRORATION_METADATA_TYPE, prorationId: "proration-123" },
        },
      ];

      const result = findMonthlyProrationLineItem(lineItems);

      expect(result).toEqual({
        id: "item-2",
        metadata: { type: MONTHLY_PRORATION_METADATA_TYPE, prorationId: "proration-123" },
      });
    });

    it("should handle line items with null type value", () => {
      const lineItems = [
        {
          id: "item-1",
          metadata: { type: null, data: "value" },
        },
        {
          id: "item-2",
          metadata: { type: MONTHLY_PRORATION_METADATA_TYPE, prorationId: "proration-123" },
        },
      ];

      const result = findMonthlyProrationLineItem(lineItems);

      expect(result).toEqual({
        id: "item-2",
        metadata: { type: MONTHLY_PRORATION_METADATA_TYPE, prorationId: "proration-123" },
      });
    });

    it("should handle line items with undefined type value", () => {
      const lineItems = [
        {
          id: "item-1",
          metadata: { type: undefined, data: "value" },
        },
        {
          id: "item-2",
          metadata: { type: MONTHLY_PRORATION_METADATA_TYPE, prorationId: "proration-123" },
        },
      ];

      const result = findMonthlyProrationLineItem(lineItems);

      expect(result).toEqual({
        id: "item-2",
        metadata: { type: MONTHLY_PRORATION_METADATA_TYPE, prorationId: "proration-123" },
      });
    });
  });
});
