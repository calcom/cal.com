import { describe, expect, it } from "vitest";

import { ZUpdateInputSchema } from "./update.schema";

describe("ZUpdateInputSchema", () => {
  describe("name validation", () => {
    it("should accept valid schedule name", () => {
      const result = ZUpdateInputSchema.safeParse({
        scheduleId: 1,
        name: "Working Hours",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Working Hours");
      }
    });

    it("should trim whitespace from schedule name", () => {
      const result = ZUpdateInputSchema.safeParse({
        scheduleId: 1,
        name: "  Working Hours  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Working Hours");
      }
    });

    it("should reject empty schedule name", () => {
      const result = ZUpdateInputSchema.safeParse({
        scheduleId: 1,
        name: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Schedule name cannot be empty");
      }
    });

    it("should reject whitespace-only schedule name", () => {
      const result = ZUpdateInputSchema.safeParse({
        scheduleId: 1,
        name: "   ",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Schedule name cannot be empty");
      }
    });

    it("should accept undefined name (optional)", () => {
      const result = ZUpdateInputSchema.safeParse({
        scheduleId: 1,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBeUndefined();
      }
    });
  });
});

