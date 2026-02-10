import { describe, expect, it } from "vitest";
import { extractDomainFromEmail, isCompanyEmail } from "./utils";

describe("utils", () => {
  describe("isCompanyEmail", () => {
    it("should return false for gmail.com email", () => {
      expect(isCompanyEmail("user@gmail.com")).toBe(false);
    });

    it("should return false for yahoo.com email", () => {
      expect(isCompanyEmail("user@yahoo.com")).toBe(false);
    });

    it("should return false for outlook.com email", () => {
      expect(isCompanyEmail("user@outlook.com")).toBe(false);
    });

    it("should return false for hotmail.com email", () => {
      expect(isCompanyEmail("user@hotmail.com")).toBe(false);
    });

    it("should return false for protonmail.com email", () => {
      expect(isCompanyEmail("user@protonmail.com")).toBe(false);
    });

    it("should return false for icloud.com email", () => {
      expect(isCompanyEmail("user@icloud.com")).toBe(false);
    });

    it("should return true for company email", () => {
      expect(isCompanyEmail("user@acme.com")).toBe(true);
    });

    it("should return true for cal.com email", () => {
      expect(isCompanyEmail("user@cal.com")).toBe(true);
    });

    it("should return false for email without @", () => {
      expect(isCompanyEmail("invalidemail")).toBe(false);
    });

    it("should return false for empty email", () => {
      expect(isCompanyEmail("")).toBe(false);
    });

    it("should return false for all popular personal email providers", () => {
      const personalProviders = [
        "gmail.com",
        "googlemail.com",
        "yahoo.com",
        "ymail.com",
        "rocketmail.com",
        "sbcglobal.net",
        "att.net",
        "outlook.com",
        "hotmail.com",
        "live.com",
        "msn.com",
        "outlook.co",
        "hotmail.co.uk",
        "aol.com",
        "icloud.com",
        "me.com",
        "mac.com",
        "mail.com",
        "email.com",
        "protonmail.com",
        "proton.me",
        "zoho.com",
        "yandex.com",
        "gmx.com",
        "fastmail.com",
        "tutanota.com",
        "mail.ru",
        "qq.com",
      ];

      for (const provider of personalProviders) {
        expect(isCompanyEmail(`user@${provider}`)).toBe(false);
      }
    });

    it("should return true for various company domains", () => {
      const companyDomains = [
        "acme.com",
        "techcorp.io",
        "business.co",
        "startup.ai",
        "enterprise.net",
        "cal.com",
      ];

      for (const domain of companyDomains) {
        expect(isCompanyEmail(`user@${domain}`)).toBe(true);
      }
    });

    it("should be case-insensitive for domain matching", () => {
      expect(isCompanyEmail("user@GMAIL.COM")).toBe(false);
      expect(isCompanyEmail("user@Gmail.Com")).toBe(false);
    });
  });

  describe("extractDomainFromEmail", () => {
    it("should extract domain from a standard email", () => {
      expect(extractDomainFromEmail("user@acme.com")).toBe("acme");
    });

    it("should return empty string for invalid input", () => {
      expect(extractDomainFromEmail("invalid")).toBe("");
    });

    it("should return empty string for empty input", () => {
      expect(extractDomainFromEmail("")).toBe("");
    });
  });
});
