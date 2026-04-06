import "@calcom/testing/lib/__mocks__/prisma";

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import { MemoryKVAdapter } from "@calcom/kv/memory-kv-adapter";

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
vi.mock("../../deployment/lib/getDeploymentKey", () => ({
  getDeploymentKey: vi.fn(),
  getDeploymentSignatureToken: vi.fn(),
}));

vi.mock("./private-api-utils", () => ({
  generateNonce: vi.fn(),
  createSignature: vi.fn(),
}));

let sharedMockKV: MemoryKVAdapter;

vi.mock("@calcom/kv/create-kv-adapter", () => ({
  createKVAdapter: vi.fn(() => sharedMockKV),
}));

const BASE_HEADERS = {
  "Content-Type": "application/json",
};

describe("LicenseKeyService", () => {
  let mockKV: MemoryKVAdapter;
  const fakeDeploymentRepo = {
    getLicenseKeyWithId: async () => null,
    getSignatureToken: async () => null,
  };

  beforeEach(async () => {
    mockKV = new MemoryKVAdapter();
    sharedMockKV = mockKV;
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
      const service = await LicenseKeyService.create(fakeDeploymentRepo, mockKV);
      expect(service).toBeInstanceOf(LicenseKeyService);
    });

    it("should create a NoopLicenseKeyService when no license key is provided", async () => {
      vi.mocked(getDeploymentKey).mockResolvedValue("");
      const LicenseKeyService = await getLicenseKeyService();
      const service = await LicenseKeyService.create(fakeDeploymentRepo, mockKV);
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
      const service = await LicenseKeyService.create(fakeDeploymentRepo, mockKV);
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
      const service = await LicenseKeyService.create(fakeDeploymentRepo, mockKV);
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
      const service = await LicenseKeyService.create(fakeDeploymentRepo, mockKV);
      const result = await service.checkLicense();
      expect(result).toBe(true);
    });

    it("should return cached response if available", async () => {
      stubEnvAndReload("CALCOM_PRIVATE_API_ROUTE", baseUrl);
      await mockKV.put(`license:${licenseKey}`, "true", 86_400);
      const LicenseKeyService = await getLicenseKeyService();
      const service = await LicenseKeyService.create(fakeDeploymentRepo, mockKV);
      const result = await service.checkLicense();
      expect(result).toBe(true);
      // Value was returned from KV - no fetch needed
      expect(result).toBe(true);
    });

    it("should fetch license validity from API if not cached", async () => {
      const url = `${baseUrl}/v1/license/${licenseKey}`;
      const mockResponse = { status: true };
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any);
      vi.mocked(generateNonce).mockReturnValue("mocked-nonce");
      vi.mocked(createSignature).mockReturnValue("mocked-signature");
      stubEnvAndReload("CALCOM_PRIVATE_API_ROUTE", baseUrl);
      const LicenseKeyService = await getLicenseKeyService();
      const service = await LicenseKeyService.create(fakeDeploymentRepo, mockKV);
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
        signal: expect.any(AbortSignal),
      });
    });

    it("should store both TTL cache and last-known on successful fetch", async () => {
      vi.spyOn(global, "fetch").mockResolvedValue({
        json: vi.fn().mockResolvedValue({ status: true }),
      } as any);
      vi.mocked(generateNonce).mockReturnValue("mocked-nonce");
      vi.mocked(createSignature).mockReturnValue("mocked-signature");
      stubEnvAndReload("CALCOM_PRIVATE_API_ROUTE", baseUrl);
      const LicenseKeyService = await getLicenseKeyService();
      const service = await LicenseKeyService.create(fakeDeploymentRepo, mockKV);
      await service.checkLicense();
      const cached = await mockKV.get(`license:${licenseKey}`);
      const lastKnown = await mockKV.get(`license:${licenseKey}:last-known`);
      expect(cached).toBe("true");
      expect(lastKnown).toBe("true");
    });

    it("should return false if API call fails and no last-known value exists", async () => {
      stubEnvAndReload("CALCOM_PRIVATE_API_ROUTE", baseUrl);
      vi.mocked(generateNonce).mockReturnValue("mocked-nonce");
      vi.mocked(createSignature).mockReturnValue("mocked-signature");
      vi.spyOn(global, "fetch").mockRejectedValue(new Error("API Failure"));
      const LicenseKeyService = await getLicenseKeyService();
      const service = await LicenseKeyService.create(fakeDeploymentRepo, mockKV);
      const result = await service.checkLicense();
      expect(result).toBe(false);
    });

    it("should return last-known value when API fails after a previous success", async () => {
      stubEnvAndReload("CALCOM_PRIVATE_API_ROUTE", baseUrl);
      vi.mocked(generateNonce).mockReturnValue("mocked-nonce");
      vi.mocked(createSignature).mockReturnValue("mocked-signature");

      const LicenseKeyService = await getLicenseKeyService();
      const service = await LicenseKeyService.create(fakeDeploymentRepo, mockKV);

      // First call: fetch succeeds
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({ status: true }),
      } as any);
      const firstResult = await service.checkLicense();
      expect(firstResult).toBe(true);

      // Simulate TTL cache expiring but last-known surviving
      await mockKV.delete(`license:${licenseKey}`);

      // Second call: fetch fails
      vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("API Failure"));
      const secondResult = await service.checkLicense();
      expect(secondResult).toBe(true);
    });

    it("should return last-known value when API returns non-JSON (HTML error page)", async () => {
      stubEnvAndReload("CALCOM_PRIVATE_API_ROUTE", baseUrl);
      vi.mocked(generateNonce).mockReturnValue("mocked-nonce");
      vi.mocked(createSignature).mockReturnValue("mocked-signature");

      // Seed last-known from a previous success
      await mockKV.put(`license:${licenseKey}:last-known`, "true");

      // Simulate Cloudflare returning an HTML error page
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        json: vi
          .fn()
          .mockRejectedValue(
            new SyntaxError('Unexpected token \'<\', "<!DOCTYPE "... is not valid JSON')
          ),
      } as any);

      const LicenseKeyService = await getLicenseKeyService();
      const service = await LicenseKeyService.create(fakeDeploymentRepo, mockKV);
      const result = await service.checkLicense();
      expect(result).toBe(true);
    });

    it("should not re-fetch when TTL cache is still valid", async () => {
      stubEnvAndReload("CALCOM_PRIVATE_API_ROUTE", baseUrl);
      vi.mocked(generateNonce).mockReturnValue("mocked-nonce");
      vi.mocked(createSignature).mockReturnValue("mocked-signature");

      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        json: vi.fn().mockResolvedValue({ status: true }),
      } as any);

      const LicenseKeyService = await getLicenseKeyService();
      const service = await LicenseKeyService.create(fakeDeploymentRepo, mockKV);

      await service.checkLicense();
      await service.checkLicense();
      await service.checkLicense();

      // Only the first call should hit the API
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("should share last-known across cold starts via KV", async () => {
      stubEnvAndReload("CALCOM_PRIVATE_API_ROUTE", baseUrl);
      vi.mocked(generateNonce).mockReturnValue("mocked-nonce");
      vi.mocked(createSignature).mockReturnValue("mocked-signature");

      // Simulate a previous lambda writing last-known to KV
      await mockKV.put(`license:${licenseKey}:last-known`, "true");

      // New cold start, TTL cache is empty, API is down
      vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Connection refused"));

      const LicenseKeyService = await getLicenseKeyService();
      const service = await LicenseKeyService.create(fakeDeploymentRepo, mockKV);
      const result = await service.checkLicense();

      // Should fall back to the last-known value from KV, not return false
      expect(result).toBe(true);
    });
  });
});
