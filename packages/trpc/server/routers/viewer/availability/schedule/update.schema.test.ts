import { describe, it, expect } from "vitest";

import { ZUpdateInputSchema } from "./update.schema";

describe("ZUpdateInputSchema", () => {
  describe("name validation", () => {
    it("should reject empty string names", () => {
      const input = {
        scheduleId: 1,
        name: "",
      };

      const result = ZUpdateInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Schedule name cannot be empty");
        expect(result.error.issues[0].path).toEqual(["name"]);
      }
    });

    it("should reject whitespace-only names", () => {
      const input = {
        scheduleId: 1,
        name: "   ",
      };

      const result = ZUpdateInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Schedule name cannot be empty");
      }
    });

    it("should accept valid names", () => {
      const input = {
        scheduleId: 1,
        name: "My Schedule",
      };

      const result = ZUpdateInputSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("My Schedule");
      }
    });
  });

  describe("full schema validation", () => {
    it("should validate a complete update request", () => {
      const input = {
        scheduleId: 1,
        name: "Updated Schedule",
        timeZone: "America/New_York",
        isDefault: true,
        schedule: [[{ start: new Date("2024-01-01T09:00:00Z"), end: new Date("2024-01-01T17:00:00Z") }]],
        dateOverrides: [{ start: new Date("2024-01-15T10:00:00Z"), end: new Date("2024-01-15T16:00:00Z") }],
      };

      const result = ZUpdateInputSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should reject invalid timezone", () => {
      const input = {
        scheduleId: 1,
        timeZone: "Invalid/Timezone",
      };

      const result = ZUpdateInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["timeZone"]);
      }
    });
  });
});
