import { describe, expect, it } from "vitest";

import { isNotACompanyEmail } from "./orgCreationUtils";

describe("orgCreationUtils", () => {
  describe("isNotACompanyEmail", () => {
    it("should return true for gmail.com email", () => {
      expect(isNotACompanyEmail("user@gmail.com")).toBe(true);
    });

    it("should return true for yahoo.com email", () => {
      expect(isNotACompanyEmail("user@yahoo.com")).toBe(true);
    });

    it("should return true for outlook.com email", () => {
      expect(isNotACompanyEmail("user@outlook.com")).toBe(true);
    });

    it("should return true for hotmail.com email", () => {
      expect(isNotACompanyEmail("user@hotmail.com")).toBe(true);
    });

    it("should return true for protonmail.com email", () => {
      expect(isNotACompanyEmail("user@protonmail.com")).toBe(true);
    });

    it("should return true for proton.me email", () => {
      expect(isNotACompanyEmail("user@proton.me")).toBe(true);
    });

    it("should return true for icloud.com email", () => {
      expect(isNotACompanyEmail("user@icloud.com")).toBe(true);
    });

    it("should return true for live.com email", () => {
      expect(isNotACompanyEmail("user@live.com")).toBe(true);
    });

    it("should return false for company email", () => {
      expect(isNotACompanyEmail("user@company.com")).toBe(false);
    });

    it("should return false for company email with subdomain", () => {
      expect(isNotACompanyEmail("user@mail.company.com")).toBe(false);
    });

    it("should return false for company email with country code", () => {
      expect(isNotACompanyEmail("user@company.co.uk")).toBe(false);
    });

    it("should return true for invalid email without @", () => {
      expect(isNotACompanyEmail("invalidemail")).toBe(true);
    });

    it("should return true for empty email", () => {
      expect(isNotACompanyEmail("")).toBe(true);
    });

    it("should return true for email with multiple @ symbols", () => {
      expect(isNotACompanyEmail("user@@company.com")).toBe(false);
    });

    it("should return true for all popular personal email providers", () => {
      const personalProviders = [
        "gmail.com",
        "yahoo.com",
        "outlook.com",
        "hotmail.com",
        "aol.com",
        "icloud.com",
        "mail.com",
        "protonmail.com",
        "proton.me",
        "zoho.com",
        "yandex.com",
        "gmx.com",
        "fastmail.com",
        "inbox.com",
        "me.com",
        "hushmail.com",
        "live.com",
        "rediffmail.com",
        "tutanota.com",
        "mail.ru",
        "usa.com",
        "qq.com",
        "163.com",
        "web.de",
        "rocketmail.com",
        "excite.com",
        "lycos.com",
        "outlook.co",
        "hotmail.co.uk",
      ];

      personalProviders.forEach((provider) => {
        expect(isNotACompanyEmail(`user@${provider}`)).toBe(true);
      });
    });

    it("should return false for various company domains", () => {
      const companyDomains = [
        "acme.com",
        "techcorp.io",
        "business.co",
        "startup.ai",
        "enterprise.net",
        "cal.com",
      ];

      companyDomains.forEach((domain) => {
        expect(isNotACompanyEmail(`user@${domain}`)).toBe(false);
      });
    });
  });
});
