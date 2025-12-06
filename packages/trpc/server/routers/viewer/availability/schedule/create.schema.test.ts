import { describe, expect, it } from "vitest";

import { ZCreateInputSchema } from "./create.schema";

describe("ZCreateInputSchema", () => {
  describe("name validation", () => {
    it("should accept valid schedule name", () => {
      const result = ZCreateInputSchema.safeParse({
        name: "Working Hours",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Working Hours");
      }
    });

    it("should trim whitespace from schedule name", () => {
      const result = ZCreateInputSchema.safeParse({
        name: "  Working Hours  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Working Hours");
      }
    });

    it("should reject empty schedule name", () => {
      const result = ZCreateInputSchema.safeParse({
        name: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Schedule name cannot be empty");
      }
    });

    it("should reject whitespace-only schedule name", () => {
      const result = ZCreateInputSchema.safeParse({
        name: "   ",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Schedule name cannot be empty");
      }
    });
  });
});




