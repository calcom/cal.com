import { describe, expect, it } from "vitest";
import { getFieldWithOptions } from "./selectOptions";

describe("selectOptions", () => {
  describe("getFieldWithOptions", () => {
    it("should return field as-is when neither options nor selectText is set", () => {
      const field = {
        id: "field-1",
        type: "text",
        label: "Name",
        options: undefined,
        selectText: undefined,
      };

      const result = getFieldWithOptions(field as any);

      // Should return the field without options property added
      expect(result.id).toBe("field-1");
      expect(result.type).toBe("text");
      expect(result.options).toBeUndefined();
    });
  });
});
