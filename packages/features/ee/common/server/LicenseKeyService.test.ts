import * as cache from "memory-cache";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import { getDeploymentKey } from "../../deployment/lib/getDeploymentKey";
import LicenseKeyService from "./LicenseKeyService";

// Mock dependencies
vi.mock("memory-cache", () => ({
  get: vi.fn(),
  put: vi.fn(),
}));
vi.mock("../../../../prisma");
vi.mock("@calcom/lib/constants", () => ({
  IS_SELF_HOSTED: false,
}));
vi.mock("../../deployment/lib/getDeploymentKey", () => ({
  getDeploymentKey: vi.fn(),
}));

describe("LicenseKeyService", () => {
  let service: LicenseKeyService;
  let baseUrl: string;
  let licenseKey: string;

  beforeEach(async () => {
    baseUrl = "http://test-api.com";
    licenseKey = "test-license-key";
    process.env.CALCOM_PRIVATE_API_ROUTE = baseUrl;
    vi.mocked(getDeploymentKey).mockResolvedValue(licenseKey);
    service = await LicenseKeyService.create();
  });

  afterEach(() => {
    vi.resetAllMocks();
    delete process.env.CALCOM_PRIVATE_API_ROUTE;
    delete process.env.NEXT_PUBLIC_IS_E2E;
  });

  describe("create", () => {
    it("should throw an error if CALCOM_PRIVATE_API_ROUTE is not set and not self-hosted", async () => {
      delete process.env.CALCOM_PRIVATE_API_ROUTE;
      await expect(LicenseKeyService.create()).rejects.toThrow("CALCOM_PRIVATE_API_ROUTE is not set");
    });

    it("should create an instance of LicenseKeyService", async () => {
      expect(service).toBeInstanceOf(LicenseKeyService);
    });
  });

  describe("incrementUsage", () => {
    it("should call the incrementUsage API and return the response", async () => {
      const mockResponse = { success: true };
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any);

      const response = await service.incrementUsage();
      expect(response).toEqual(mockResponse);
      expect(fetchSpy).toHaveBeenCalledWith(`${baseUrl}/license/usage/increment/${licenseKey}`, {
        method: "POST",
        mode: "cors",
      });
    });

    it("should throw an error if the API call fails", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockRejectedValue(new Error("API Failure"));

      await expect(service.incrementUsage()).rejects.toThrow("API Failure");
      expect(fetchSpy).toHaveBeenCalledWith(`${baseUrl}/usage/increment/${licenseKey}`, {
        method: "POST",
        mode: "cors",
      });
    });
  });

  describe("checkLicense", () => {
    it("should return true if NEXT_PUBLIC_IS_E2E is set", async () => {
      process.env.NEXT_PUBLIC_IS_E2E = "true";
      const result = await service.checkLicense();
      expect(result).toBe(true);
    });

    it("should return cached response if available", async () => {
      const url = `${baseUrl}/v1/license/${licenseKey}`;
      vi.mocked(cache.get).mockReturnValue(true);

      const result = await service.checkLicense();
      expect(result).toBe(true);
      expect(cache.get).toHaveBeenCalledWith(url);
    });

    it("should fetch license validity from API if not cached", async () => {
      const url = `${baseUrl}/v1/license/${licenseKey}`;
      vi.mocked(cache.get).mockReturnValue(null);
      const mockResponse = { valid: true };
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any);

      const result = await service.checkLicense();
      expect(result).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(url, { mode: "cors" });
      expect(cache.put).toHaveBeenCalledWith(url, mockResponse.valid, service.CACHING_TIME);
    });

    it("should return false if API call fails", async () => {
      const url = `${baseUrl}/v1/license/${licenseKey}`;
      vi.mocked(cache.get).mockReturnValue(null);
      const fetchSpy = vi.spyOn(global, "fetch").mockRejectedValue(new Error("API Failure"));

      const result = await service.checkLicense();
      expect(result).toBe(false);
      expect(fetchSpy).toHaveBeenCalledWith(url, { mode: "cors" });
    });
  });
});
