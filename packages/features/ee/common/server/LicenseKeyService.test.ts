import "@calcom/testing/lib/__mocks__/prisma";

import process from "node:process";
import * as cache from "memory-cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDeploymentKey, getDeploymentSignatureToken } from "../../deployment/lib/getDeploymentKey";
import { NoopLicenseKeyService } from "./LicenseKeyService";
import { createSignature, generateNonce } from "./private-api-utils";

const baseUrl = "http://test-api.com";
const licenseKey = "test-license-key";

/** So we can override in specific test below */
process.env.NEXT_PUBLIC_IS_E2E = "0";
/** All fetch call in LicenseKeyService will fail without this */
process.env.CAL_SIGNATURE_TOKEN = "dummy";

/**
 * This is needed to ensure the constants and env are fresh.
 * If not, we would need to override constants on each scenario with differing constants/env vars.
 */
async function getLicenseKeyService() {
  return (await import("./LicenseKeyService")).default;
}

async function stubEnvAndReload(key: string, value: string) {
  // We set env variable
  vi.stubEnv(key, value);
  // We refresh constants and prevent cached modules.
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
  getDeploymentSignatureToken: vi.fn(),
}));

vi.mock("./private-api-utils", () => ({
  generateNonce: vi.fn(),
  createSignature: vi.fn(),
}));

const BASE_HEADERS = {
  "Content-Type": "application/json",
};

describe("LicenseKeyService", () => {
  beforeEach(async () => {
    vi.mocked(getDeploymentKey).mockResolvedValue(licenseKey);
    vi.mocked(getDeploymentSignatureToken).mockResolvedValue("mockSignatureToken");
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  describe("create", () => {
    it("should create an instance of LicenseKeyService", async () => {
      const LicenseKeyService = await getLicenseKeyService();
      const service = await LicenseKeyService.create();
      expect(service).toBeInstanceOf(LicenseKeyService);
    });

    it("should create a NoopLicenseKeyService when no license key is provided", async () => {
      vi.mocked(getDeploymentKey).mockResolvedValue("");
      const LicenseKeyService = await getLicenseKeyService();
      const service = await LicenseKeyService.create();
      expect(service).toBeInstanceOf(NoopLicenseKeyService);
    });
  });

  describe("incrementUsage", () => {
    it("should call the incrementUsage API and return the response", async () => {
      const mockResponse = { success: true };
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any);

      vi.mocked(generateNonce).mockReturnValue("mocked-nonce");
      vi.mocked(createSignature).mockReturnValue("mocked-signature");
      stubEnvAndReload("CALCOM_PRIVATE_API_ROUTE", baseUrl);
      const LicenseKeyService = await getLicenseKeyService();
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
        signal: expect.any(AbortSignal),
      });
    });

    it("should throw an error if the API call fails", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockRejectedValue(new Error("API Failure"));
      vi.mocked(generateNonce).mockReturnValue("mocked-nonce");
      vi.mocked(createSignature).mockReturnValue("mocked-signature");
      stubEnvAndReload("CALCOM_PRIVATE_API_ROUTE", baseUrl);
      const LicenseKeyService = await getLicenseKeyService();
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
        signal: expect.any(AbortSignal),
      });
    });
  });

  describe("checkLicense", () => {
    it("should return true if NEXT_PUBLIC_IS_E2E is set", async () => {
      stubEnvAndReload("NEXT_PUBLIC_IS_E2E", "1");
      const LicenseKeyService = await getLicenseKeyService();
      const service = await LicenseKeyService.create();
      const result = await service.checkLicense();
      expect(result).toBe(true);
    });

    it("should return cached response if available", async () => {
      const url = `${baseUrl}/v1/license/${licenseKey}`;
      vi.mocked(cache.get).mockReturnValue(true);
      stubEnvAndReload("CALCOM_PRIVATE_API_ROUTE", baseUrl);
      const LicenseKeyService = await getLicenseKeyService();
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
      stubEnvAndReload("CALCOM_PRIVATE_API_ROUTE", baseUrl);
      const LicenseKeyService = await getLicenseKeyService();
      const service = await LicenseKeyService.create();
      const result = await service.checkLicense();
      expect(result).toBe(true);
      expect(cache.get).toHaveBeenCalledWith(url);
      expect(fetchSpy).toHaveBeenCalledWith(url, {
        body: undefined,
        headers: {
          ...BASE_HEADERS,
          nonce: "mocked-nonce",
          signature: "mocked-signature",
          "x-cal-license-key": "test-license-key",
        },
        mode: "cors",
        signal: expect.any(AbortSignal),
      });
    });

    it("should return false if API call fails", async () => {
      const url = `${baseUrl}/v1/license/${licenseKey}`;
      stubEnvAndReload("CALCOM_PRIVATE_API_ROUTE", baseUrl);
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(generateNonce).mockReturnValue("mocked-nonce");
      vi.mocked(createSignature).mockReturnValue("mocked-signature");
      const fetchSpy = vi.spyOn(global, "fetch").mockRejectedValue(new Error("API Failure"));
      const LicenseKeyService = await getLicenseKeyService();
      const service = await LicenseKeyService.create();
      const result = await service.checkLicense();
      expect(result).toBe(false);
      expect(fetchSpy).toHaveBeenCalledWith(url, {
        body: undefined,
        headers: {
          ...BASE_HEADERS,
          nonce: "mocked-nonce",
          signature: "mocked-signature",
          "x-cal-license-key": "test-license-key",
        },
        mode: "cors",
        signal: expect.any(AbortSignal),
      });
    });
  });
});
