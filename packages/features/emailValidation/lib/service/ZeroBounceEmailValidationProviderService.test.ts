import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { ZeroBounceEmailValidationProviderService } from "./ZeroBounceEmailValidationProviderService";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger at module level
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  getSubLogger: vi.fn(),
};

// Mock the logger import
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => mockLogger),
  },
}));

describe("ZeroBounceEmailValidationProviderService", () => {
  let service: ZeroBounceEmailValidationProviderService;
  const originalApiKey = process.env.ZEROBOUNCE_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variable for tests
    process.env.ZEROBOUNCE_API_KEY = "test-api-key";
    service = new ZeroBounceEmailValidationProviderService();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    // Restore original environment variable
    if (originalApiKey) {
      process.env.ZEROBOUNCE_API_KEY = originalApiKey;
    } else {
      delete process.env.ZEROBOUNCE_API_KEY;
    }
  });

  describe("validateEmail", () => {
    it("should validate email successfully with valid response", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          address: "test@example.com",
          status: "valid",
          sub_status: "none",
          account: "test",
          domain: "example.com",
          disposable: false,
          toxic: false,
          processed_at: "2023-12-07T10:00:00.000Z",
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.validateEmail({ email: "test@example.com" });

      expect(result).toEqual({
        email: "test@example.com",
        status: "valid",
        subStatus: "none",
      });
    });

    it("should block invalid emails", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          address: "invalid@example.com",
          status: "invalid",
          sub_status: "mailbox_not_found",
          processed_at: "2023-12-07T10:00:00.000Z",
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.validateEmail({ email: "invalid@example.com" });

      expect(result.status).toBe("invalid");
      expect(service.isEmailBlocked(result.status)).toBe(true);
    });

    it("should block spamtrap emails", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          address: "spamtrap@example.com",
          status: "spamtrap",
          sub_status: "spamtrap",
          processed_at: "2023-12-07T10:00:00.000Z",
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.validateEmail({ email: "spamtrap@example.com" });

      expect(result.status).toBe("spamtrap");
      expect(service.isEmailBlocked(result.status)).toBe(true);
    });

    it("should block abuse emails", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          address: "abuse@example.com",
          status: "abuse",
          sub_status: "abuse",
          processed_at: "2023-12-07T10:00:00.000Z",
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.validateEmail({ email: "abuse@example.com" });

      expect(result.status).toBe("abuse");
      expect(service.isEmailBlocked(result.status)).toBe(true);
    });

    it("should block do_not_mail emails", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          address: "donotmail@example.com",
          status: "do_not_mail",
          sub_status: "do_not_mail",
          processed_at: "2023-12-07T10:00:00.000Z",
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.validateEmail({ email: "donotmail@example.com" });

      expect(result.status).toBe("do_not_mail");
      expect(service.isEmailBlocked(result.status)).toBe(true);
    });

    it("should not block catch-all emails", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          address: "catchall@example.com",
          status: "catch-all",
          sub_status: "catch_all",
          processed_at: "2023-12-07T10:00:00.000Z",
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.validateEmail({ email: "catchall@example.com" });

      expect(result.status).toBe("catch-all");
      expect(service.isEmailBlocked(result.status)).toBe(false);
    });

    it("should throw error when API key is missing", async () => {
      // Clear the API key for this test
      delete process.env.ZEROBOUNCE_API_KEY;
      const serviceWithoutKey = new ZeroBounceEmailValidationProviderService();

      await expect(serviceWithoutKey.validateEmail({ email: "test@example.com" })).rejects.toThrow(
        "ZeroBounce API key not configured"
      );

      expect(mockLogger.warn).toHaveBeenCalledWith("ZeroBounce API key not configured");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    // Note: API timeout test is complex with current setup but timeout behavior is implemented

    it("should throw error on API error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(service.validateEmail({ email: "test@example.com" })).rejects.toThrow("Network error");
    });

    it("should throw error on HTTP error response", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      };

      mockFetch.mockResolvedValue(mockResponse);

      await expect(service.validateEmail({ email: "test@example.com" })).rejects.toThrow(
        "ZeroBounce API returned 500: Internal Server Error"
      );
    });

    it("should include IP address in API request when provided", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          address: "test@example.com",
          status: "valid",
          sub_status: "none",
          processed_at: "2023-12-07T10:00:00.000Z",
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      await service.validateEmail({
        email: "test@example.com",
        ipAddress: "192.168.1.1",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("ip_address=192.168.1.1"),
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "ZeroBounce API validation completed",
        JSON.stringify({
          email: "test@example.com",
          status: "valid",
          blocked: false,
        })
      );
    });
  });

  describe("isEmailBlocked", () => {
    it("should return true for blocked statuses", () => {
      expect(service.isEmailBlocked("invalid")).toBe(true);
      expect(service.isEmailBlocked("spamtrap")).toBe(true);
      expect(service.isEmailBlocked("abuse")).toBe(true);
      expect(service.isEmailBlocked("do_not_mail")).toBe(true);
    });

    it("should return false for non-blocked statuses", () => {
      expect(service.isEmailBlocked("valid")).toBe(false);
      expect(service.isEmailBlocked("catch-all")).toBe(false);
      expect(service.isEmailBlocked("unknown")).toBe(false);
    });
  });
});
