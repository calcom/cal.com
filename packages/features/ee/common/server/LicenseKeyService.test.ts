import "../../../../../tests/libs/__mocks__/prisma";

import * as cache from "memory-cache";
import { describe, it, expect, beforeEach, vi, afterEach, beforeAll } from "vitest";

import { getDeploymentKey } from "../../deployment/lib/getDeploymentKey";
import { createSignature, generateNonce } from "./private-api-utils";

const baseUrl = "http://test-api.com";
const licenseKey = "test-license-key";

async function stubEnvAndReload(key: string, value: string) {
  // We set env variable
  vi.stubEnv(key, value);
  // @see https://github.com/vitest-dev/vitest/issues/4232#issuecomment-1745452522
  vi.resetModules();
  await import("@calcom/lib/constants");
}

// Mock dependencies
vi.mock("memory-cache", () => ({
  get: vi.fn(),
  put: vi.fn(),
}));

vi.mock("../../deployment/lib/getDeploymentKey", () => ({
  getDeploymentKey: vi.fn(),
}));

vi.mock("./private-api-utils", () => ({
  generateNonce: vi.fn(),
  createSignature: vi.fn(),
}));

const BASE_HEADERS = {
  "Content-Type": "application/json",
};

describe("LicenseKeyService", () => {
  beforeAll(() => {
    // Setup env vars
  });

  beforeEach(async () => {
    vi.mocked(getDeploymentKey).mockResolvedValue(licenseKey);
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  describe("create", () => {
    it("should create an instance of LicenseKeyService", async () => {
      const LicenseKeyService = (await import("./LicenseKeyService")).default;
      const service = await LicenseKeyService.create();
      expect(service).toBeInstanceOf(LicenseKeyService);
    });
  });

  describe("incrementUsage", () => {
    it("should call the incrementUsage API and return the response", async () => {
      const mockResponse = { success: true };
      stubEnvAndReload("CAL_SIGNATURE_TOKEN", "dummy");
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any);

      vi.mocked(generateNonce).mockReturnValue("mocked-nonce");
      vi.mocked(createSignature).mockReturnValue("mocked-signature");
      stubEnvAndReload("CALCOM_PRIVATE_API_ROUTE", baseUrl);
      const LicenseKeyService = (await import("./LicenseKeyService")).default;
      const service = await LicenseKeyService.create();
      const response = await service.incrementUsage();
      expect(response).toEqual(mockResponse);
      expect(fetchSpy).toHaveBeenCalledWith(`${baseUrl}/v1/license/usage/increment?event=booking`, {
        body: undefined,
        headers: {
          ...BASE_HEADERS,
          nonce: "mocked-nonce",
          signature: "mocked-signature",
          "x-cal-license-key": "test-license-key",
        },
        method: "POST",
        mode: "cors",
      });
    });

    it("should throw an error if the API call fails", async () => {
      stubEnvAndReload("CAL_SIGNATURE_TOKEN", "dummy");
      const fetchSpy = vi.spyOn(global, "fetch").mockRejectedValue(new Error("API Failure"));
      vi.mocked(generateNonce).mockReturnValue("mocked-nonce");
      vi.mocked(createSignature).mockReturnValue("mocked-signature");
      stubEnvAndReload("CALCOM_PRIVATE_API_ROUTE", baseUrl);
      // We set env variable
      const LicenseKeyService = (await import("./LicenseKeyService")).default;
      // Pre
      const service = await LicenseKeyService.create();
      await expect(service.incrementUsage()).rejects.toThrow("API Failure");
      expect(fetchSpy).toHaveBeenCalledWith(`${baseUrl}/v1/license/usage/increment?event=booking`, {
        body: undefined,
        headers: {
          ...BASE_HEADERS,
          nonce: "mocked-nonce",
          signature: "mocked-signature",
          "x-cal-license-key": "test-license-key",
        },
        method: "POST",
        mode: "cors",
      });
    });
  });

  describe("checkLicense", () => {
    it("should return true if NEXT_PUBLIC_IS_E2E is set", async () => {
      stubEnvAndReload("NEXT_PUBLIC_IS_E2E", "1");
      const LicenseKeyService = (await import("./LicenseKeyService")).default;
      const service = await LicenseKeyService.create();
      const result = await service.checkLicense();
      expect(result).toBe(true);
      vi.unstubAllEnvs();
    });

    it("should return cached response if available", async () => {
      const url = `${baseUrl}/v1/license/${licenseKey}`;
      vi.mocked(cache.get).mockReturnValue(true);
      const LicenseKeyService = (await import("./LicenseKeyService")).default;
      const service = await LicenseKeyService.create();
      const result = await service.checkLicense();
      expect(result).toBe(true);
      expect(cache.get).toHaveBeenCalledWith(url);
    });

    it("should fetch license validity from API if not cached", async () => {
      const url = `${baseUrl}/v1/license/${licenseKey}`;
      vi.mocked(cache.get).mockReturnValue(null);
      const mockResponse = { status: true };
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any);

      vi.mocked(generateNonce).mockReturnValue("mocked-nonce");
      vi.mocked(createSignature).mockReturnValue("mocked-signature");
      const LicenseKeyService = (await import("./LicenseKeyService")).default;
      const service = await LicenseKeyService.create();
      const result = await service.checkLicense();
      expect(result).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(url, {
        body: undefined,
        headers: {
          ...BASE_HEADERS,
          nonce: "mocked-nonce",
          signature: "mocked-signature",
          "x-cal-license-key": "test-license-key",
        },
        mode: "cors",
      });
    });

    it("should return false if API call fails", async () => {
      const url = `${baseUrl}/v1/license/${licenseKey}`;
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(generateNonce).mockReturnValue("mocked-nonce");
      vi.mocked(createSignature).mockReturnValue("mocked-signature");
      const fetchSpy = vi.spyOn(global, "fetch").mockRejectedValue(new Error("API Failure"));
      stubEnvAndReload("NEXT_PUBLIC_IS_E2E", "");
      const LicenseKeyService = (await import("./LicenseKeyService")).default;
      fetch.mockRejectedValue(new Error("API Failure"));
      const service = await LicenseKeyService.create();
      const result = await service.checkLicense();
      expect(result).toBe(false);
      expect(fetch).toHaveBeenCalledWith(url, {
        body: undefined,
        headers: {
          ...BASE_HEADERS,
          nonce: "mocked-nonce",
          signature: "mocked-signature",
          "x-cal-license-key": "test-license-key",
        },
        mode: "cors",
      });
    });
  });
});
