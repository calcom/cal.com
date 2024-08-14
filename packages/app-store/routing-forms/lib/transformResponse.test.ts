import { describe, it, expect } from "vitest";

import { getFieldResponseForJsonLogic } from "./transformResponse";

describe("getFieldResponseForJsonLogic", () => {
  it("should return an empty string if value is undefined", () => {
    const field = { type: "text", options: undefined };
    const value = undefined;
    const result = getFieldResponseForJsonLogic({ field, value });
    expect(result).toBe("");
  });

  it("should transform number field to number", () => {
    const field = { type: "number", options: undefined };
    const value = "123";
    const result = getFieldResponseForJsonLogic({ field, value });
    expect(result).toBe(123);
  });

  describe("multiselect", () => {
    describe("non-legacy options", () => {
      it("should return option ids for a field that has non-legacy options", () => {
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

      it("should return ids by matching labels", () => {
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
});
