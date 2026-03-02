import { describe, it, expect } from "vitest";

import {
  ZResponseMultipleValues,
  ZResponseSingleValue,
  ZResponseTextValue,
  ZResponseNumericValue,
  ZResponseValue,
  ZResponse,
} from "./types";

describe("Insights types - Zod schemas", () => {
  describe("ZResponseMultipleValues", () => {
    it("should accept array of strings", () => {
      const result = ZResponseMultipleValues.safeParse(["option1", "option2", "option3"]);
      expect(result.success).toBe(true);
    });

    it("should accept empty array", () => {
      const result = ZResponseMultipleValues.safeParse([]);
      expect(result.success).toBe(true);
    });

    it("should reject non-string array elements", () => {
      const result = ZResponseMultipleValues.safeParse([1, 2, 3]);
      expect(result.success).toBe(false);
    });
  });

  describe("ZResponseSingleValue", () => {
    it("should accept a string", () => {
      const result = ZResponseSingleValue.safeParse("hello");
      expect(result.success).toBe(true);
    });

    it("should reject a number", () => {
      const result = ZResponseSingleValue.safeParse(42);
      expect(result.success).toBe(false);
    });
  });

  describe("ZResponseTextValue", () => {
    it("should accept a string", () => {
      const result = ZResponseTextValue.safeParse("some text value");
      expect(result.success).toBe(true);
    });

    it("should accept empty string", () => {
      const result = ZResponseTextValue.safeParse("");
      expect(result.success).toBe(true);
    });
  });

  describe("ZResponseNumericValue", () => {
    it("should accept a number", () => {
      const result = ZResponseNumericValue.safeParse(42);
      expect(result.success).toBe(true);
    });

    it("should accept zero", () => {
      const result = ZResponseNumericValue.safeParse(0);
      expect(result.success).toBe(true);
    });

    it("should accept negative numbers", () => {
      const result = ZResponseNumericValue.safeParse(-5);
      expect(result.success).toBe(true);
    });

    it("should reject a string", () => {
      const result = ZResponseNumericValue.safeParse("42");
      expect(result.success).toBe(false);
    });
  });

  describe("ZResponseValue (union)", () => {
    it("should accept a string", () => {
      const result = ZResponseValue.safeParse("hello");
      expect(result.success).toBe(true);
    });

    it("should accept a number", () => {
      const result = ZResponseValue.safeParse(42);
      expect(result.success).toBe(true);
    });

    it("should accept an array of strings", () => {
      const result = ZResponseValue.safeParse(["a", "b", "c"]);
      expect(result.success).toBe(true);
    });

    it("should reject an object", () => {
      const result = ZResponseValue.safeParse({ key: "value" });
      expect(result.success).toBe(false);
    });

    it("should reject boolean", () => {
      const result = ZResponseValue.safeParse(true);
      expect(result.success).toBe(false);
    });

    it("should reject null", () => {
      const result = ZResponseValue.safeParse(null);
      expect(result.success).toBe(false);
    });
  });

  describe("ZResponse (record)", () => {
    it("should accept a record of string keys to valid response values", () => {
      const result = ZResponse.safeParse({
        field1: "text value",
        field2: 42,
        field3: ["option1", "option2"],
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty object", () => {
      const result = ZResponse.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should reject record with invalid values", () => {
      const result = ZResponse.safeParse({
        field1: { nested: "object" },
      });
      expect(result.success).toBe(false);
    });
  });
});
