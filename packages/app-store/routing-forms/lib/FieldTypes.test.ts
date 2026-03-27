import { describe, expect, it } from "vitest";
import { isValidRoutingFormFieldType } from "./FieldTypes";

describe("FieldTypes", () => {
  describe("isValidRoutingFormFieldType", () => {
    it("should return false for an invalid field type", () => {
      expect(isValidRoutingFormFieldType("invalid_type")).toBe(false);
    });

    it("should return true for valid field types", () => {
      expect(isValidRoutingFormFieldType("text")).toBe(true);
      expect(isValidRoutingFormFieldType("select")).toBe(true);
      expect(isValidRoutingFormFieldType("email")).toBe(true);
    });
  });
});
