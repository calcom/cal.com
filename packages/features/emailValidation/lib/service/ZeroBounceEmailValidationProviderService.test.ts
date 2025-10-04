import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { ZeroBounceEmailValidationProviderService } from "./ZeroBounceEmailValidationProviderService";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ZeroBounceEmailValidationProviderService", () => {
  let service: ZeroBounceEmailValidationProviderService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variable for tests
    process.env.ZEROBOUNCE_API_KEY = "test-api-key";
    service = new ZeroBounceEmailValidationProviderService();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    delete process.env.ZEROBOUNCE_API_KEY;
  });

  describe("validateEmail", () => {
    it("should return status as provided by ZeroBounce", async () => {
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
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.validateEmail({ email: "test@example.com" });

      expect(result).toEqual({
        status: "valid",
        subStatus: "none",
      });
    });

    it("should reject validation request when ZeroBounce API key is not configured", async () => {
      // Clear the API key for this test
      delete process.env.ZEROBOUNCE_API_KEY;
      const serviceWithoutKey = new ZeroBounceEmailValidationProviderService();

      await expect(serviceWithoutKey.validateEmail({ email: "test@example.com" })).rejects.toThrow(
        "ZeroBounce API key not configured"
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should propagate error when ZeroBounce API is unreachable or returns network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(service.validateEmail({ email: "test@example.com" })).rejects.toThrow("Network error");
    });

    it("should reject validation request when ZeroBounce API returns server error", async () => {
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

    it("should validate email with additional IP address context when IP address is provided", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          address: "test@example.com",
          status: "valid",
          sub_status: "none",
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
    });
  });
});
