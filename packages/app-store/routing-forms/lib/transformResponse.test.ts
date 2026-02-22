import { describe, expect, it } from "vitest";
import { getFieldResponseForJsonLogic } from "./transformResponse";

describe("getFieldResponseForJsonLogic", () => {
  it("should return an empty string if value is undefined", () => {
    const field = { type: "text", options: undefined };
    const value = undefined;
    const result = getFieldResponseForJsonLogic({ field, value });
    expect(result).toBe("");
  });

  it("should transform value for a number type field to number", () => {
    const field = { type: "number", options: undefined };
    const value = "123";
    const result = getFieldResponseForJsonLogic({ field, value });
    expect(result).toBe(123);
  });

  describe("multiselect", () => {
    describe("non-legacy options", () => {
      it("should return option ids for the field if the value is an array of option ids", () => {
        const field = {
          type: "multiselect",
          options: [
            { id: "1", label: "Option 1" },
            { id: "2", label: "Option 2" },
          ],
        };
        const value = ["1", "2"];
        const result = getFieldResponseForJsonLogic({ field, value });
        expect(result).toEqual(["1", "2"]);
      });

      it("should return ids if matching labels are provided in value", () => {
        const field = {
          type: "multiselect",
          options: [
            { id: "1", label: "Option 1" },
            { id: "2", label: "Option 2" },
          ],
        };
        const value = ["Option 1", "Option 2"];
        const result = getFieldResponseForJsonLogic({ field, value });
        expect(result).toEqual(["1", "2"]);
      });

      it("should return the value as it is if it doesn't match any of the labels or option ids", () => {
        const field = {
          type: "multiselect",
          options: [
            { id: "1", label: "Option 1" },
            { id: "2", label: "Option 2" },
          ],
        };
        const value = ["Option 10", "Option 11"];
        const result = getFieldResponseForJsonLogic({ field, value });
        expect(result).toEqual(["Option 10", "Option 11"]);
      });
    });

    describe("legacy options", () => {
      it("should return what is given for a field that has legacy options but the values don't match labels", () => {
        const field = {
          type: "multiselect",
          options: [
            { id: null, label: "Option 1" },
            { id: null, label: "Option 2" },
          ],
        };
        const value = ["1", "2"];
        const result = getFieldResponseForJsonLogic({ field, value });
        expect(result).toEqual(["1", "2"]);
      });

      it("should return matching labels for a field that has legacy options", () => {
        const field = {
          type: "multiselect",
          options: [
            { id: null, label: "Option 1" },
            { id: null, label: "Option 2" },
          ],
        };
        const value = ["Option 1", "Option 2"];
        const result = getFieldResponseForJsonLogic({ field, value });
        expect(result).toEqual(["Option 1", "Option 2"]);
      });

      it("should handle multiselect field with legacy options", () => {
        const field = {
          type: "multiselect",
          options: [
            { label: "Option 1", id: null },
            { label: "Option 2", id: null },
          ],
        };
        const value = ["Option 1", "Option 2"];
        const result = getFieldResponseForJsonLogic({ field, value });
        expect(result).toEqual(["Option 1", "Option 2"]);
      });
    });
  });

  describe("select", () => {
    it("should handle select field with options", () => {
      const field = {
        type: "select",
        options: [
          { id: "1", label: "Option 1" },
          { id: "2", label: "Option 2" },
        ],
      };
      const value = "1";
      const result = getFieldResponseForJsonLogic({ field, value });
      expect(result).toBe("1");
    });

    it("should handle select field with legacy options", () => {
      const field = {
        type: "select",
        options: [
          { label: "Option 1", id: null },
          { label: "Option 2", id: null },
        ],
      };
      const value = "Option 1";
      const result = getFieldResponseForJsonLogic({ field, value });
      expect(result).toBe("Option 1");
    });

    it("should handle select field with number as string", () => {
      const field = {
        type: "select",
        options: [
          { id: "1", label: "Option 1" },
          { id: "2", label: "Option 2" },
        ],
      };
      const value = 1;
      const result = getFieldResponseForJsonLogic({ field, value });
      expect(result).toBe("1");
    });
  });

  describe("checkbox", () => {
    it("should transform array values using option ids like multiselect", () => {
      const field = {
        type: "checkbox",
        options: [
          { id: "a1", label: "Alpha" },
          { id: "b2", label: "Beta" },
        ],
      };
      const result = getFieldResponseForJsonLogic({ field, value: ["a1", "b2"] });
      expect(result).toEqual(["a1", "b2"]);
    });

    it("should resolve labels to ids for checkbox fields", () => {
      const field = {
        type: "checkbox",
        options: [
          { id: "a1", label: "Alpha" },
          { id: "b2", label: "Beta" },
        ],
      };
      const result = getFieldResponseForJsonLogic({ field, value: ["Alpha", "Beta"] });
      expect(result).toEqual(["a1", "b2"]);
    });

    it("should handle comma-separated string value for checkbox", () => {
      const field = {
        type: "checkbox",
        options: [
          { id: "a1", label: "Alpha" },
          { id: "b2", label: "Beta" },
        ],
      };
      const result = getFieldResponseForJsonLogic({ field, value: "a1,b2" });
      expect(result).toEqual(["a1", "b2"]);
    });
  });

  describe("radio", () => {
    it("should transform single value using option id like select", () => {
      const field = {
        type: "radio",
        options: [
          { id: "x1", label: "Yes" },
          { id: "x2", label: "No" },
        ],
      };
      const result = getFieldResponseForJsonLogic({ field, value: "x1" });
      expect(result).toBe("x1");
    });

    it("should resolve label to id for radio fields", () => {
      const field = {
        type: "radio",
        options: [
          { id: "x1", label: "Yes" },
          { id: "x2", label: "No" },
        ],
      };
      const result = getFieldResponseForJsonLogic({ field, value: "Yes" });
      expect(result).toBe("x1");
    });

    it("should handle number value for radio fields", () => {
      const field = {
        type: "radio",
        options: [
          { id: "1", label: "Option 1" },
          { id: "2", label: "Option 2" },
        ],
      };
      const result = getFieldResponseForJsonLogic({ field, value: 1 });
      expect(result).toBe("1");
    });
  });

  describe("passthrough types", () => {
    it("should pass through boolean field value unchanged", () => {
      const field = { type: "boolean", options: undefined };
      const result = getFieldResponseForJsonLogic({ field, value: "true" });
      expect(result).toBe("true");
    });

    it("should pass through address field value unchanged", () => {
      const field = { type: "address", options: undefined };
      const result = getFieldResponseForJsonLogic({ field, value: "123 Main St" });
      expect(result).toBe("123 Main St");
    });

    it("should pass through url field value unchanged", () => {
      const field = { type: "url", options: undefined };
      const result = getFieldResponseForJsonLogic({ field, value: "https://cal.com" });
      expect(result).toBe("https://cal.com");
    });
  });
});
