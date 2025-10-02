import { describe, it, expect } from "vitest";

import { sanitizeUsername } from "./sanitizeUsername";

describe("sanitizeUsername", () => {
  describe("empty and null inputs", () => {
    it("should return empty string for empty input", () => {
      expect(sanitizeUsername("")).toBe("");
    });

    it("should return empty string for null input", () => {
      expect(sanitizeUsername(null as string | null)).toBe("");
    });

    it("should return empty string for undefined input", () => {
      expect(sanitizeUsername(undefined as string | undefined)).toBe("");
    });
  });

  describe("URL scheme removal", () => {
    it("should remove http:// prefix", () => {
      expect(sanitizeUsername("http://example.com")).toBe("example.com");
    });

    it("should remove https:// prefix", () => {
      expect(sanitizeUsername("https://example.com")).toBe("example.com");
    });

    it("should remove HTTP:// prefix (case insensitive)", () => {
      expect(sanitizeUsername("HTTP://example.com")).toBe("example.com");
    });

    it("should remove HTTPS:// prefix (case insensitive)", () => {
      expect(sanitizeUsername("HTTPS://example.com")).toBe("example.com");
    });

    it("should handle mixed case URL schemes", () => {
      expect(sanitizeUsername("HtTpS://example.com")).toBe("example.com");
    });
  });

  describe("invalid character removal", () => {
    it("should remove special characters like @ and !", () => {
      expect(sanitizeUsername("user@name!")).toBe("username");
    });

    it("should remove spaces", () => {
      expect(sanitizeUsername("user name")).toBe("username");
    });

    it("should remove slashes", () => {
      expect(sanitizeUsername("user/name\\test")).toBe("usernametest");
    });

    it("should remove parentheses and brackets", () => {
      expect(sanitizeUsername("user(name)[test]{value}")).toBe("usernametestvalue");
    });

    it("should remove multiple consecutive special characters", () => {
      expect(sanitizeUsername("user@@@name!!!")).toBe("username");
    });

    it("should remove emoji and unicode characters", () => {
      expect(sanitizeUsername("user😀name")).toBe("username");
    });
  });

  describe("valid character preservation", () => {
    it("should preserve alphanumeric characters", () => {
      expect(sanitizeUsername("user123")).toBe("user123");
    });

    it("should preserve hyphens", () => {
      expect(sanitizeUsername("user-name")).toBe("user-name");
    });

    it("should preserve underscores", () => {
      expect(sanitizeUsername("user_name")).toBe("user_name");
    });

    it("should preserve dots", () => {
      expect(sanitizeUsername("user.name")).toBe("user.name");
    });

    it("should preserve plus signs", () => {
      expect(sanitizeUsername("user+name")).toBe("user+name");
    });

    it("should preserve asterisks", () => {
      expect(sanitizeUsername("user*name")).toBe("user*name");
    });

    it("should preserve all valid characters together", () => {
      expect(sanitizeUsername("user-name_123.test+value*")).toBe("user-name_123.test+value*");
    });
  });

  describe("case conversion", () => {
    it("should convert uppercase to lowercase", () => {
      expect(sanitizeUsername("USERNAME")).toBe("username");
    });

    it("should convert mixed case to lowercase", () => {
      expect(sanitizeUsername("UserName")).toBe("username");
    });

    it("should convert camelCase to lowercase", () => {
      expect(sanitizeUsername("userName")).toBe("username");
    });

    it("should handle uppercase with valid special characters", () => {
      expect(sanitizeUsername("USER-NAME_123")).toBe("user-name_123");
    });
  });

  describe("complex scenarios", () => {
    it("should handle URL with path and query parameters", () => {
      expect(sanitizeUsername("https://example.com/user?name=test")).toBe("example.comusernametest");
    });

    it("should sanitize URL with special characters", () => {
      expect(sanitizeUsername("https://example.com/@username!")).toBe("example.comusername");
    });

    it("should handle mixed valid and invalid characters", () => {
      expect(sanitizeUsername("user@name-123_test.value+more*extra")).toBe(
        "username-123_test.value+more*extra"
      );
    });

    it("should handle leading and trailing invalid characters", () => {
      expect(sanitizeUsername("@@@username!!!")).toBe("username");
    });

    it("should handle only invalid characters", () => {
      expect(sanitizeUsername("@@@!!!###")).toBe("");
    });

    it("should handle URL scheme with invalid characters and case", () => {
      expect(sanitizeUsername("HTTPS://User@Example.Com")).toBe("userexample.com");
    });

    it("should preserve valid username formats", () => {
      expect(sanitizeUsername("john-doe")).toBe("john-doe");
      expect(sanitizeUsername("jane_smith_123")).toBe("jane_smith_123");
      expect(sanitizeUsername("user.name")).toBe("user.name");
    });
  });
});
