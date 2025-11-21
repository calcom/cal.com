import { describe, it, expect } from "vitest";

import { AccessScope } from "@calcom/prisma/enums";

import { parseAndValidateScopes } from "../scopeValidator";

describe("parseAndValidateScopes", () => {
  describe("valid scopes", () => {
    it("should accept valid READ_PROFILE scope", () => {
      const result = parseAndValidateScopes(["READ_PROFILE"]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_PROFILE]);
      }
    });

    it("should accept valid READ_BOOKING scope", () => {
      const result = parseAndValidateScopes(["READ_BOOKING"]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_BOOKING]);
      }
    });

    it("should accept multiple valid scopes", () => {
      const result = parseAndValidateScopes(["READ_PROFILE", "READ_BOOKING"]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_BOOKING, AccessScope.READ_PROFILE]);
      }
    });

    it("should accept space-delimited scopes", () => {
      const result = parseAndValidateScopes("READ_PROFILE READ_BOOKING");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_BOOKING, AccessScope.READ_PROFILE]);
      }
    });

    it("should accept comma-delimited scopes", () => {
      const result = parseAndValidateScopes("READ_PROFILE,READ_BOOKING");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_BOOKING, AccessScope.READ_PROFILE]);
      }
    });

    it("should accept mixed delimiters", () => {
      const result = parseAndValidateScopes("READ_PROFILE, READ_BOOKING");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_BOOKING, AccessScope.READ_PROFILE]);
      }
    });

    it("should handle trailing commas", () => {
      const result = parseAndValidateScopes("READ_PROFILE,READ_BOOKING,");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_BOOKING, AccessScope.READ_PROFILE]);
      }
    });

    it("should handle trailing spaces", () => {
      const result = parseAndValidateScopes("READ_PROFILE READ_BOOKING ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_BOOKING, AccessScope.READ_PROFILE]);
      }
    });

    it("should handle extra whitespace", () => {
      const result = parseAndValidateScopes("  READ_PROFILE   READ_BOOKING  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_BOOKING, AccessScope.READ_PROFILE]);
      }
    });
  });

  describe("normalization", () => {
    it("should deduplicate scopes", () => {
      const result = parseAndValidateScopes(["READ_PROFILE", "READ_PROFILE", "READ_BOOKING"]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_BOOKING, AccessScope.READ_PROFILE]);
        expect(result.scopes.length).toBe(2);
      }
    });

    it("should sort scopes alphabetically", () => {
      const result = parseAndValidateScopes(["READ_BOOKING", "READ_PROFILE"]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_BOOKING, AccessScope.READ_PROFILE]);
      }
    });

    it("should trim whitespace from individual scopes", () => {
      const result = parseAndValidateScopes([" READ_PROFILE ", " READ_BOOKING "]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_BOOKING, AccessScope.READ_PROFILE]);
      }
    });

    it("should normalize case to uppercase", () => {
      const result = parseAndValidateScopes(["read_profile", "READ_BOOKING"]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_BOOKING, AccessScope.READ_PROFILE]);
      }
    });
  });

  describe("empty scopes", () => {
    it("should default to READ_PROFILE for empty array", () => {
      const result = parseAndValidateScopes([]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_PROFILE]);
      }
    });

    it("should default to READ_PROFILE for empty string", () => {
      const result = parseAndValidateScopes("");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_PROFILE]);
      }
    });

    it("should default to READ_PROFILE for whitespace-only string", () => {
      const result = parseAndValidateScopes("   ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_PROFILE]);
      }
    });

    it("should return error when allowEmpty is false", () => {
      const result = parseAndValidateScopes([], { allowEmpty: false });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("At least one scope is required");
      }
    });
  });

  describe("invalid scopes", () => {
    it("should reject unknown scope", () => {
      const result = parseAndValidateScopes(["WRITE_BOOKING"]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Unknown scopes");
        expect(result.error).toContain("WRITE_BOOKING");
      }
    });

    it("should reject multiple unknown scopes", () => {
      const result = parseAndValidateScopes(["WRITE_BOOKING", "DELETE_PROFILE"]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Unknown scopes");
        expect(result.error).toContain("WRITE_BOOKING");
        expect(result.error).toContain("DELETE_PROFILE");
      }
    });

    it("should reject mix of valid and invalid scopes", () => {
      const result = parseAndValidateScopes(["READ_PROFILE", "WRITE_BOOKING"]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Unknown scopes");
        expect(result.error).toContain("WRITE_BOOKING");
      }
    });

    it("should reject scopes with invalid characters", () => {
      const result = parseAndValidateScopes(["READ_PROFILE; DROP TABLE"]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid scope format");
      }
    });

    it("should reject scopes with special characters", () => {
      const result = parseAndValidateScopes(["READ@PROFILE"]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid scope format");
      }
    });

    it("should reject scopes with hyphens", () => {
      const result = parseAndValidateScopes(["READ-PROFILE"]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid scope format");
      }
    });
  });

  describe("length validation", () => {
    it("should reject excessively long scope string", () => {
      const longScope = "A".repeat(600);
      const result = parseAndValidateScopes([longScope]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Scope string too long");
      }
    });

    it("should accept scope string at max length", () => {
      const validScopes = Array(50).fill("READ_PROFILE");
      const result = parseAndValidateScopes(validScopes);
      expect(result.success).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle single scope in array", () => {
      const result = parseAndValidateScopes(["READ_PROFILE"]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_PROFILE]);
      }
    });

    it("should handle single scope as string", () => {
      const result = parseAndValidateScopes("READ_PROFILE");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_PROFILE]);
      }
    });

    it("should handle multiple commas", () => {
      const result = parseAndValidateScopes("READ_PROFILE,,READ_BOOKING");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_BOOKING, AccessScope.READ_PROFILE]);
      }
    });

    it("should handle multiple spaces", () => {
      const result = parseAndValidateScopes("READ_PROFILE    READ_BOOKING");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scopes).toEqual([AccessScope.READ_BOOKING, AccessScope.READ_PROFILE]);
      }
    });
  });
});
