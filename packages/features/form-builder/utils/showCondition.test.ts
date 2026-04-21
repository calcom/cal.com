import { describe, expect, it } from "vitest";
import { isFieldShownByCondition } from "./showCondition";

describe("isFieldShownByCondition", () => {
  it("returns true when the field has no showCondition", () => {
    expect(isFieldShownByCondition({ showCondition: undefined }, {})).toBe(true);
  });

  describe("op: equals", () => {
    const field = {
      showCondition: { fieldName: "hearAbout", op: "equals" as const, value: "web" },
    };

    it("shows when parent response equals configured value", () => {
      expect(isFieldShownByCondition(field, { hearAbout: "web" })).toBe(true);
    });

    it("hides when parent response differs", () => {
      expect(isFieldShownByCondition(field, { hearAbout: "print" })).toBe(false);
    });

    it("hides when parent response is missing", () => {
      expect(isFieldShownByCondition(field, {})).toBe(false);
    });

    it("hides when responses object is null", () => {
      expect(isFieldShownByCondition(field, null)).toBe(false);
    });

    it("supports an array of allowed values", () => {
      const multi = {
        showCondition: { fieldName: "hearAbout", op: "equals" as const, value: ["web", "social"] },
      };
      expect(isFieldShownByCondition(multi, { hearAbout: "social" })).toBe(true);
      expect(isFieldShownByCondition(multi, { hearAbout: "print" })).toBe(false);
    });

    it("coerces numeric responses to strings", () => {
      const numeric = {
        showCondition: { fieldName: "count", op: "equals" as const, value: "3" },
      };
      expect(isFieldShownByCondition(numeric, { count: 3 })).toBe(true);
    });

    it("reads the selected option from a radioInput-shaped response", () => {
      expect(
        isFieldShownByCondition(field, { hearAbout: { value: "web", optionValue: "example.com" } })
      ).toBe(true);
    });
  });

  describe("op: notEquals", () => {
    const field = {
      showCondition: { fieldName: "hearAbout", op: "notEquals" as const, value: "web" },
    };

    it("shows when parent response differs", () => {
      expect(isFieldShownByCondition(field, { hearAbout: "print" })).toBe(true);
    });

    it("hides when parent response matches", () => {
      expect(isFieldShownByCondition(field, { hearAbout: "web" })).toBe(false);
    });

    it("shows when parent response is missing", () => {
      expect(isFieldShownByCondition(field, {})).toBe(true);
    });
  });

  describe("op: includes", () => {
    const field = {
      showCondition: { fieldName: "topics", op: "includes" as const, value: "billing" },
    };

    it("shows when response array contains the value", () => {
      expect(isFieldShownByCondition(field, { topics: ["billing", "support"] })).toBe(true);
    });

    it("hides when response array does not contain the value", () => {
      expect(isFieldShownByCondition(field, { topics: ["support"] })).toBe(false);
    });

    it("treats a single string response as a single-item array", () => {
      expect(isFieldShownByCondition(field, { topics: "billing" })).toBe(true);
    });

    it("matches when any configured value is present in the response", () => {
      const any = {
        showCondition: { fieldName: "topics", op: "includes" as const, value: ["billing", "sales"] },
      };
      expect(isFieldShownByCondition(any, { topics: ["support", "sales"] })).toBe(true);
    });
  });

  describe("op: notIncludes", () => {
    const field = {
      showCondition: { fieldName: "topics", op: "notIncludes" as const, value: "billing" },
    };

    it("shows when response array lacks the value", () => {
      expect(isFieldShownByCondition(field, { topics: ["support"] })).toBe(true);
    });

    it("hides when response array contains the value", () => {
      expect(isFieldShownByCondition(field, { topics: ["billing"] })).toBe(false);
    });
  });
});
