import { describe, it, expect } from "vitest";

import {
  schemaSingleScheduleBodyParams,
  schemaCreateScheduleBodyParams,
} from "../../../lib/validations/schedule";

describe("Schedule Validation Schemas", () => {
  describe("schemaSingleScheduleBodyParams (update)", () => {
    it("should reject empty string names", () => {
      const input = {
        name: "",
      };

      const result = schemaSingleScheduleBodyParams.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Schedule name cannot be empty");
        expect(result.error.issues[0].path).toEqual(["name"]);
      }
    });

    it("should reject whitespace-only names", () => {
      const input = {
        name: "   ",
      };

      const result = schemaSingleScheduleBodyParams.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Schedule name cannot be empty");
      }
    });

    it("should allow updates without name", () => {
      const input = {
        timeZone: "America/New_York",
      };

      const result = schemaSingleScheduleBodyParams.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBeUndefined();
        expect(result.data.timeZone).toBe("America/New_York");
      }
    });

    it("should validate timezone", () => {
      const invalidInput = {
        timeZone: "Invalid/Timezone",
      };

      const result = schemaSingleScheduleBodyParams.safeParse(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["timeZone"]);
      }
    });
  });

  describe("schemaCreateScheduleBodyParams", () => {
    it("should require name for creation", () => {
      const input = {
        timeZone: "America/New_York",
      };

      const result = schemaCreateScheduleBodyParams.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("name"))).toBe(true);
      }
    });

    it("should reject empty name for creation", () => {
      const input = {
        name: "",
        timeZone: "America/New_York",
      };

      const result = schemaCreateScheduleBodyParams.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Schedule name cannot be empty");
      }
    });

    it("should accept valid creation data", () => {
      const input = {
        name: "New Schedule",
        timeZone: "America/New_York",
      };

      const result = schemaCreateScheduleBodyParams.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("New Schedule");
        expect(result.data.timeZone).toBe("America/New_York");
      }
    });

    it("should allow optional userId", () => {
      const input = {
        name: "Admin Schedule",
        timeZone: "America/New_York",
        userId: 123,
      };

      const result = schemaCreateScheduleBodyParams.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.userId).toBe(123);
      }
    });
  });
});
