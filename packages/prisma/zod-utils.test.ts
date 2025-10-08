import { describe, it, expect } from "vitest";

import { excludeOrRequireEmailSchema } from "./zod-utils";

describe("excludeOrRequireEmailSchema", () => {
  describe("Valid patterns", () => {
    it("should accept empty string (optional field)", () => {
      const result = excludeOrRequireEmailSchema.safeParse("");
      expect(result.success).toBe(true);
    });

    it("should accept simple domain without TLD", () => {
      const result = excludeOrRequireEmailSchema.safeParse("yahoo");
      expect(result.success).toBe(true);
    });

    it("should accept single-dot domain", () => {
      const result = excludeOrRequireEmailSchema.safeParse("gmail.com");
      expect(result.success).toBe(true);
    });

    it("should accept multi-dot domain (yahoo.co.in)", () => {
      const result = excludeOrRequireEmailSchema.safeParse("yahoo.co.in");
      expect(result.success).toBe(true);
    });

    it("should accept multi-dot domain (outlook.co.id)", () => {
      const result = excludeOrRequireEmailSchema.safeParse("outlook.co.id");
      expect(result.success).toBe(true);
    });

    it("should accept multi-dot domain (mail.yahoo.co.uk)", () => {
      const result = excludeOrRequireEmailSchema.safeParse("mail.yahoo.co.uk");
      expect(result.success).toBe(true);
    });

    it("should accept domain pattern with @", () => {
      const result = excludeOrRequireEmailSchema.safeParse("@gmail.com");
      expect(result.success).toBe(true);
    });

    it("should accept full email address", () => {
      const result = excludeOrRequireEmailSchema.safeParse("user@hotmail.com");
      expect(result.success).toBe(true);
    });

    it("should accept comma-separated multiple valid domains", () => {
      const result = excludeOrRequireEmailSchema.safeParse("gmail.com, yahoo.co.in, @hotmail.com");
      expect(result.success).toBe(true);
    });

    it("should accept comma-separated domains with various formats", () => {
      const result = excludeOrRequireEmailSchema.safeParse(
        "yahoo, gmail.com, yahoo.co.in, @outlook.com, user@hotmail.com"
      );
      expect(result.success).toBe(true);
    });

    it("should accept domains with hyphens", () => {
      const result = excludeOrRequireEmailSchema.safeParse("my-domain.com");
      expect(result.success).toBe(true);
    });

    it("should accept domains with numbers", () => {
      const result = excludeOrRequireEmailSchema.safeParse("domain123.com");
      expect(result.success).toBe(true);
    });
  });

  describe("Invalid patterns", () => {
    it("should reject domain with capital letters", () => {
      const result = excludeOrRequireEmailSchema.safeParse("Yahoo");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Invalid email");
        expect(result.error.issues[0].message).toContain("Yahoo");
      }
    });

    it("should reject domain with capital letters in TLD", () => {
      const result = excludeOrRequireEmailSchema.safeParse("gmail.Com");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Invalid email");
        expect(result.error.issues[0].message).toContain("gmail.Com");
      }
    });

    it("should reject email with capital letters", () => {
      const result = excludeOrRequireEmailSchema.safeParse("User@Gmail.com");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Invalid email");
        expect(result.error.issues[0].message).toContain("User@Gmail.com");
      }
    });

    it("should reject comma-separated list with one invalid domain", () => {
      const result = excludeOrRequireEmailSchema.safeParse("gmail.com, Yahoo.com, hotmail.com");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Invalid email");
        expect(result.error.issues[0].message).toContain("Yahoo.com");
      }
    });

    it("should reject comma-separated list with multiple invalid domains", () => {
      const result = excludeOrRequireEmailSchema.safeParse("Gmail.com, Yahoo.com");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Invalid email");
        expect(result.error.issues[0].message).toContain("Gmail.com");
        expect(result.error.issues[0].message).toContain("Yahoo.com");
      }
    });

    it("should reject domain with special characters", () => {
      const result = excludeOrRequireEmailSchema.safeParse("domain!.com");
      expect(result.success).toBe(false);
    });

    it("should reject domain with spaces", () => {
      const result = excludeOrRequireEmailSchema.safeParse("my domain.com");
      expect(result.success).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle domains with trailing/leading spaces in comma-separated list", () => {
      const result = excludeOrRequireEmailSchema.safeParse(" gmail.com , yahoo.co.in ");
      expect(result.success).toBe(true);
    });

    it("should accept single character TLD", () => {
      const result = excludeOrRequireEmailSchema.safeParse("example.c.om");
      expect(result.success).toBe(true);
    });

    it("should accept very long multi-dot domain", () => {
      const result = excludeOrRequireEmailSchema.safeParse("mail.corp.company.co.uk");
      expect(result.success).toBe(true);
    });
  });

  describe("Error messaging", () => {
    it("should show invalid domains in error message", () => {
      const result = excludeOrRequireEmailSchema.safeParse("Gmail.com, yahoo.com, Hotmail.com");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Invalid email");
        expect(result.error.issues[0].message).toContain("Gmail.com");
        expect(result.error.issues[0].message).toContain("Hotmail.com");
        expect(result.error.issues[0].message).not.toContain("yahoo.com");
      }
    });
  });
});
