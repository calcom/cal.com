import { describe, expect, test, vi, afterEach, beforeEach } from "vitest";
import {
  DEFAULT_FREE_EMAIL_DOMAINS,
  isCommonFreeEmailDomain,
  hasMxRecords,
  validateCorporateEmail,
  type EmailValidationResult,
} from "./emailValidation";

vi.mock("dns", () => ({
  default: {
    resolveMx: vi.fn(),
  },
}));

vi.mock("@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain", () => ({
  checkIfFreeEmailDomain: vi.fn(),
}));

vi.mock("@calcom/features/watchlist/lib/utils/normalization", () => ({
  extractDomainFromEmail: vi.fn((email: string) => {
    const parts = email.split("@");
    return parts.length === 2 ? parts[1].toLowerCase() : null;
  }),
}));

describe("emailValidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("DEFAULT_FREE_EMAIL_DOMAINS", () => {
    test("should contain common free email domains", () => {
      expect(DEFAULT_FREE_EMAIL_DOMAINS.has("gmail.com")).toBe(true);
      expect(DEFAULT_FREE_EMAIL_DOMAINS.has("outlook.com")).toBe(true);
      expect(DEFAULT_FREE_EMAIL_DOMAINS.has("yahoo.com")).toBe(true);
      expect(DEFAULT_FREE_EMAIL_DOMAINS.has("hotmail.com")).toBe(true);
      expect(DEFAULT_FREE_EMAIL_DOMAINS.has("aol.com")).toBe(true);
      expect(DEFAULT_FREE_EMAIL_DOMAINS.has("icloud.com")).toBe(true);
      expect(DEFAULT_FREE_EMAIL_DOMAINS.has("qq.com")).toBe(true);
      expect(DEFAULT_FREE_EMAIL_DOMAINS.has("163.com")).toBe(true);
      expect(DEFAULT_FREE_EMAIL_DOMAINS.has("126.com")).toBe(true);
      expect(DEFAULT_FREE_EMAIL_DOMAINS.has("foxmail.com")).toBe(true);
      expect(DEFAULT_FREE_EMAIL_DOMAINS.has("aliyun.com")).toBe(true);
      expect(DEFAULT_FREE_EMAIL_DOMAINS.has("live.com")).toBe(true);
      expect(DEFAULT_FREE_EMAIL_DOMAINS.has("msn.com")).toBe(true);
    });

    test("should not contain corporate domains", () => {
      expect(DEFAULT_FREE_EMAIL_DOMAINS.has("company.com")).toBe(false);
      expect(DEFAULT_FREE_EMAIL_DOMAINS.has("mycompany.io")).toBe(false);
      expect(DEFAULT_FREE_EMAIL_DOMAINS.has("enterprise.org")).toBe(false);
    });
  });

  describe("isCommonFreeEmailDomain", () => {
    test("should return true for gmail.com", () => {
      expect(isCommonFreeEmailDomain("gmail.com")).toBe(true);
    });

    test("should return true for outlook.com", () => {
      expect(isCommonFreeEmailDomain("outlook.com")).toBe(true);
    });

    test("should return true for qq.com", () => {
      expect(isCommonFreeEmailDomain("qq.com")).toBe(true);
    });

    test("should return true for 163.com", () => {
      expect(isCommonFreeEmailDomain("163.com")).toBe(true);
    });

    test("should return false for corporate domain", () => {
      expect(isCommonFreeEmailDomain("company.com")).toBe(false);
    });

    test("should be case insensitive", () => {
      expect(isCommonFreeEmailDomain("GMAIL.COM")).toBe(true);
      expect(isCommonFreeEmailDomain("Gmail.Com")).toBe(true);
    });

    test("should trim whitespace", () => {
      expect(isCommonFreeEmailDomain("  gmail.com  ")).toBe(true);
    });
  });

  describe("hasMxRecords", () => {
    test("should return true when MX records exist", async () => {
      const dns = await import("dns");
      (dns.default.resolveMx as any).mockImplementation((domain: string, callback: any) => {
        callback(null, [{ exchange: "mx1.example.com", priority: 10 }]);
      });

      const result = await hasMxRecords("example.com");
      expect(result).toBe(true);
    });

    test("should return false when MX records do not exist", async () => {
      const dns = await import("dns");
      (dns.default.resolveMx as any).mockImplementation((domain: string, callback: any) => {
        callback(new Error("NXDOMAIN"), null);
      });

      const result = await hasMxRecords("nonexistent-domain.invalid");
      expect(result).toBe(false);
    });

    test("should return false when DNS query fails", async () => {
      const dns = await import("dns");
      (dns.default.resolveMx as any).mockImplementation((domain: string, callback: any) => {
        callback(new Error("Network error"), null);
      });

      const result = await hasMxRecords("example.com");
      expect(result).toBe(false);
    });

    test("should return false when empty MX records array", async () => {
      const dns = await import("dns");
      (dns.default.resolveMx as any).mockImplementation((domain: string, callback: any) => {
        callback(null, []);
      });

      const result = await hasMxRecords("example.com");
      expect(result).toBe(false);
    });
  });

  describe("validateCorporateEmail", () => {
    test("should return valid for corporate email when requireCorporateEmail is false", async () => {
      const { checkIfFreeEmailDomain } = await import("@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain");
      (checkIfFreeEmailDomain as any).mockResolvedValue(false);

      const result = await validateCorporateEmail("user@company.com", {
        requireCorporateEmail: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.isFreeEmail).toBe(false);
    });

    test("should return valid for free email when requireCorporateEmail is false", async () => {
      const { checkIfFreeEmailDomain } = await import("@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain");
      (checkIfFreeEmailDomain as any).mockResolvedValue(true);

      const result = await validateCorporateEmail("user@gmail.com", {
        requireCorporateEmail: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.isFreeEmail).toBe(true);
    });

    test("should return invalid for common free email when requireCorporateEmail is true", async () => {
      const result = await validateCorporateEmail("user@gmail.com", {
        requireCorporateEmail: true,
        checkMxRecords: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.isFreeEmail).toBe(true);
      expect(result.error).toBe("corporate_email_required");
    });

    test("should return invalid for qq.com email when requireCorporateEmail is true", async () => {
      const result = await validateCorporateEmail("user@qq.com", {
        requireCorporateEmail: true,
        checkMxRecords: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.isFreeEmail).toBe(true);
      expect(result.error).toBe("corporate_email_required");
    });

    test("should return invalid for 163.com email when requireCorporateEmail is true", async () => {
      const result = await validateCorporateEmail("user@163.com", {
        requireCorporateEmail: true,
        checkMxRecords: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.isFreeEmail).toBe(true);
      expect(result.error).toBe("corporate_email_required");
    });

    test("should return invalid for outlook.com email when requireCorporateEmail is true", async () => {
      const result = await validateCorporateEmail("user@outlook.com", {
        requireCorporateEmail: true,
        checkMxRecords: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.isFreeEmail).toBe(true);
      expect(result.error).toBe("corporate_email_required");
    });

    test("should check watchlist for non-common free email domains", async () => {
      const { checkIfFreeEmailDomain } = await import("@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain");
      (checkIfFreeEmailDomain as any).mockResolvedValue(true);

      const result = await validateCorporateEmail("user@freedomain.com", {
        requireCorporateEmail: true,
        checkMxRecords: false,
      });

      expect(checkIfFreeEmailDomain).toHaveBeenCalledWith({ email: "user@freedomain.com" });
      expect(result.isValid).toBe(false);
      expect(result.isFreeEmail).toBe(true);
      expect(result.error).toBe("corporate_email_required");
    });

    test("should return valid for corporate email when requireCorporateEmail is true", async () => {
      const { checkIfFreeEmailDomain } = await import("@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain");
      (checkIfFreeEmailDomain as any).mockResolvedValue(false);

      const dns = await import("dns");
      (dns.default.resolveMx as any).mockImplementation((domain: string, callback: any) => {
        callback(null, [{ exchange: "mx1.company.com", priority: 10 }]);
      });

      const result = await validateCorporateEmail("user@company.com", {
        requireCorporateEmail: true,
        checkMxRecords: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.isFreeEmail).toBe(false);
      expect(result.hasMxRecords).toBe(true);
    });

    test("should return invalid for domain without MX records when checkMxRecords is true", async () => {
      const { checkIfFreeEmailDomain } = await import("@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain");
      (checkIfFreeEmailDomain as any).mockResolvedValue(false);

      const dns = await import("dns");
      (dns.default.resolveMx as any).mockImplementation((domain: string, callback: any) => {
        callback(new Error("NXDOMAIN"), null);
      });

      const result = await validateCorporateEmail("user@invalid-domain.invalid", {
        requireCorporateEmail: true,
        checkMxRecords: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.isFreeEmail).toBe(false);
      expect(result.hasMxRecords).toBe(false);
      expect(result.error).toBe("invalid_email_domain");
    });

    test("should skip MX check when checkMxRecords is false", async () => {
      const { checkIfFreeEmailDomain } = await import("@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain");
      (checkIfFreeEmailDomain as any).mockResolvedValue(false);

      const result = await validateCorporateEmail("user@company.com", {
        requireCorporateEmail: true,
        checkMxRecords: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.hasMxRecords).toBeNull();
    });

    test("should be case insensitive for email domain", async () => {
      const result = await validateCorporateEmail("USER@GMAIL.COM", {
        requireCorporateEmail: true,
        checkMxRecords: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.isFreeEmail).toBe(true);
      expect(result.error).toBe("corporate_email_required");
    });

    test("should return invalid for invalid email format", async () => {
      const { extractDomainFromEmail } = await import("@calcom/features/watchlist/lib/utils/normalization");
      (extractDomainFromEmail as any).mockReturnValue(null);

      const result = await validateCorporateEmail("invalid-email", {
        requireCorporateEmail: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid email format");
    });

    test("should handle watchlist errors gracefully", async () => {
      const { checkIfFreeEmailDomain } = await import("@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain");
      (checkIfFreeEmailDomain as any).mockRejectedValue(new Error("Database error"));

      const dns = await import("dns");
      (dns.default.resolveMx as any).mockImplementation((domain: string, callback: any) => {
        callback(null, [{ exchange: "mx1.company.com", priority: 10 }]);
      });

      const result = await validateCorporateEmail("user@company.com", {
        requireCorporateEmail: true,
        checkMxRecords: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.isFreeEmail).toBe(false);
    });

    test("should handle DNS errors gracefully when checkMxRecords is true", async () => {
      const { checkIfFreeEmailDomain } = await import("@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain");
      (checkIfFreeEmailDomain as any).mockResolvedValue(false);

      const dns = await import("dns");
      (dns.default.resolveMx as any).mockImplementation((domain: string, callback: any) => {
        throw new Error("Unexpected error");
      });

      const result = await validateCorporateEmail("user@company.com", {
        requireCorporateEmail: true,
        checkMxRecords: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.hasMxRecords).toBeNull();
    });
  });
});
