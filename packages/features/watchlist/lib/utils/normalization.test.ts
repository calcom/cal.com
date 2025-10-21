import { describe, expect, test } from "vitest";

import { normalizeEmail, normalizeDomain, extractDomainFromEmail, normalizeUsername } from "./normalization";

describe("normalization", () => {
  describe("normalizeEmail", () => {
    test("should normalize basic email", () => {
      expect(normalizeEmail("Test@Example.COM")).toBe("test@example.com");
      expect(normalizeEmail("  user@domain.org  ")).toBe("user@domain.org");
    });

    test("should throw on invalid emails", () => {
      expect(() => normalizeEmail("invalid")).toThrow("Invalid email format");
      expect(() => normalizeEmail("@domain.com")).toThrow("Invalid email format");
      expect(() => normalizeEmail("user@")).toThrow("Invalid email format");
    });
  });

  describe("normalizeDomain", () => {
    test("should normalize basic domain", () => {
      expect(normalizeDomain("Example.COM")).toBe("example.com");
      expect(normalizeDomain("@Domain.ORG")).toBe("domain.org");
      expect(normalizeDomain("  sub.domain.net  ")).toBe("sub.domain.net");
    });

    test("should preserve full domain including subdomains", () => {
      expect(normalizeDomain("mail.google.com")).toBe("mail.google.com");
      expect(normalizeDomain("sub.domain.example.org")).toBe("sub.domain.example.org");
    });

    test("should handle multi-level TLDs correctly", () => {
      expect(normalizeDomain("example.co.uk")).toBe("example.co.uk");
      expect(normalizeDomain("mail.example.co.uk")).toBe("mail.example.co.uk");
      expect(normalizeDomain("company.com.au")).toBe("company.com.au");
    });

    test("should throw on invalid domains", () => {
      expect(() => normalizeDomain("invalid..domain")).toThrow("Invalid domain format");
      expect(() => normalizeDomain(".domain.com")).toThrow("Invalid domain format");
      expect(() => normalizeDomain("domain.")).toThrow("Invalid domain format");
    });
  });

  describe("extractDomainFromEmail", () => {
    test("should extract and normalize domain from email", () => {
      expect(extractDomainFromEmail("user@Example.COM")).toBe("example.com");
      expect(extractDomainFromEmail("test@sub.domain.org")).toBe("sub.domain.org");
      expect(extractDomainFromEmail("user@mail.google.com")).toBe("mail.google.com");
    });

    test("should handle multi-level TLDs", () => {
      expect(extractDomainFromEmail("user@example.co.uk")).toBe("example.co.uk");
      expect(extractDomainFromEmail("admin@mail.company.com.au")).toBe("mail.company.com.au");
    });

    test("should throw on invalid emails", () => {
      expect(() => extractDomainFromEmail("invalid")).toThrow("Invalid email format");
    });
  });

  describe("normalizeUsername", () => {
    test("should normalize basic username", () => {
      expect(normalizeUsername("TestUser")).toBe("testuser");
      expect(normalizeUsername("  user_name  ")).toBe("user_name");
      expect(normalizeUsername("User.Name-123")).toBe("user.name-123");
    });

    test("should preserve special characters", () => {
      expect(normalizeUsername("user@name!")).toBe("user@name!");
      expect(normalizeUsername("test.user-123")).toBe("test.user-123");
    });

    test("should throw on invalid usernames", () => {
      expect(() => normalizeUsername("")).toThrow("Invalid username: must be a non-empty string");
    });
  });

  describe("Edge cases and consistency", () => {
    test("should handle international domains", () => {
      // Note: In a real implementation, you might want to handle punycode
      expect(normalizeDomain("münchen.de")).toBe("münchen.de");
    });

    test("should be consistent across multiple calls", () => {
      const email = "Test.User+Tag@GMAIL.COM";
      const result1 = normalizeEmail(email);
      const result2 = normalizeEmail(email);
      expect(result1).toBe(result2);
    });

    test("should handle empty strings gracefully", () => {
      expect(() => normalizeEmail("")).toThrow();
      expect(() => normalizeDomain("")).toThrow();
      expect(() => normalizeUsername("")).toThrow();
    });
  });
});
