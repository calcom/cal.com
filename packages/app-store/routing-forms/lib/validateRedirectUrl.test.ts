import { describe, expect, it } from "vitest";

import { validateVariablesNotInQueryParams } from "./validateRedirectUrl";

describe("validateVariablesNotInQueryParams", () => {
  describe("valid URLs - variables only in path", () => {
    it("should allow variables in path only", () => {
      const result = validateVariablesNotInQueryParams("/team/{name}/meeting");
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it("should allow multiple variables in path", () => {
      const result = validateVariablesNotInQueryParams("/{department}/{name}/book");
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it("should allow URLs with no variables", () => {
      const result = validateVariablesNotInQueryParams("/team/fixed/meeting");
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it("should allow URLs with static query params and path variables", () => {
      const result = validateVariablesNotInQueryParams("/team/{name}?type=meeting&priority=high");
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it("should handle empty strings", () => {
      const result = validateVariablesNotInQueryParams("");
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it("should allow full URLs with path variables only", () => {
      const result = validateVariablesNotInQueryParams("https://example.com/team/{department}/book");
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });
  });

  describe("invalid URLs - variables in query parameters", () => {
    it("should reject variables in query param values", () => {
      const result = validateVariablesNotInQueryParams("/chat?name={name}");
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(["name"]);
    });

    it("should reject variables in query param keys", () => {
      const result = validateVariablesNotInQueryParams("/chat?{key}=value");
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(["key"]);
    });

    it("should reject multiple variables in query params", () => {
      const result = validateVariablesNotInQueryParams("/chat?name={name}&dept={department}");
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(["name", "department"]);
    });

    it("should reject when path has valid variable but query has invalid variable", () => {
      const result = validateVariablesNotInQueryParams("/{team}/chat?name={name}");
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(["name"]);
    });

    it("should reject variables anywhere in query string", () => {
      const result = validateVariablesNotInQueryParams("/page?static=value&dynamic={var}");
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(["var"]);
    });
  });

  describe("edge cases", () => {
    it("should handle URLs with fragment identifiers", () => {
      const result = validateVariablesNotInQueryParams("/page?name={name}#section");
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(["name"]);
    });

    it("should handle case-sensitive variable names", () => {
      const result = validateVariablesNotInQueryParams("/page?param={UserName}");
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(["UserName"]);
    });

    it("should handle variables with underscores", () => {
      const result = validateVariablesNotInQueryParams("/page?param={user_name}");
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(["user_name"]);
    });

    it("should handle query string that starts with ? only", () => {
      const result = validateVariablesNotInQueryParams("/page?");
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });
  });
});
