import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";

import { DeploymentsService } from "./deployments.service";
import { DeploymentsRepository } from "./deployments.repository";
import { RedisService } from "@/modules/redis/redis.service";

const mockFetch: jest.Mock = jest.fn();
global.fetch = mockFetch;

describe("DeploymentsService", () => {
  let service: DeploymentsService;
  let mockRedis: { get: jest.Mock; set: jest.Mock };
  let mockConfigService: { get: jest.Mock };

  beforeEach(async () => {
    mockRedis = { get: jest.fn(), set: jest.fn() };
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === "api.licenseKey") return "test-license-key";
        if (key === "api.licenseKeyUrl") return "https://example.com/license";
        if (key === "e2e") return false;
        return undefined;
      }),
    };
    mockFetch.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentsService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DeploymentsRepository, useValue: { getDeployment: jest.fn() } },
        { provide: RedisService, useValue: { redis: mockRedis } },
      ],
    }).compile();

    service = module.get(DeploymentsService);
    jest.spyOn(Logger.prototype, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("checkLicense - early returns", () => {
    it("returns true when e2e mode is enabled", async () => {
      mockConfigService.get.mockImplementation((key: string) => (key === "e2e" ? true : undefined));
      expect(await service.checkLicense()).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns false when no license key is configured", async () => {
      mockConfigService.get.mockImplementation((key: string) => (key === "e2e" ? false : undefined));
      expect(await service.checkLicense()).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns cached result if available", async () => {
      mockRedis.get.mockResolvedValue('{"status":true}');
      expect(await service.checkLicense()).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns false when cached data is corrupted", async () => {
      mockRedis.get.mockResolvedValue("invalid json{");
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ status: false }),
      });
      expect(await service.checkLicense()).toBe(false);
    });
  });

  describe("checkLicense - HTTP response handling", () => {
    beforeEach(() => {
      mockRedis.get.mockResolvedValue(null);
    });

    it("returns false when response is not ok", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 401 });
      expect(await service.checkLicense()).toBe(false);
    });

    it("returns false when response is HTML", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
      });
      expect(await service.checkLicense()).toBe(false);
    });

    it("returns false when response has no content-type header", async () => {
      mockFetch.mockResolvedValue({ ok: true, headers: new Headers({}) });
      expect(await service.checkLicense()).toBe(false);
    });

    it("accepts application/json; charset=utf-8", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json; charset=utf-8" }),
        json: () => Promise.resolve({ status: true }),
      });
      expect(await service.checkLicense()).toBe(true);
    });
  });

  describe("checkLicense - JSON validation", () => {
    beforeEach(() => {
      mockRedis.get.mockResolvedValue(null);
    });

    it("returns false when status field is missing", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ foo: "bar" }),
      });
      expect(await service.checkLicense()).toBe(false);
    });

    it("returns false when status field is not boolean", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ status: "valid" }),
      });
      expect(await service.checkLicense()).toBe(false);
    });

    it("returns true when license is valid", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ status: true }),
      });
      expect(await service.checkLicense()).toBe(true);
    });

    it("returns false when license is invalid", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ status: false }),
      });
      expect(await service.checkLicense()).toBe(false);
    });
  });

  describe("checkLicense - error handling", () => {
    beforeEach(() => {
      mockRedis.get.mockResolvedValue(null);
    });

    it("returns false on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));
      expect(await service.checkLicense()).toBe(false);
    });

    it("returns false on timeout", async () => {
      const abortError = new Error("Timeout");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValue(abortError);
      expect(await service.checkLicense()).toBe(false);
    });
  });

  describe("checkLicense - caching behavior", () => {
    beforeEach(() => {
      mockRedis.get.mockResolvedValue(null);
    });

    it("caches valid license response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ status: true }),
      });
      await service.checkLicense();
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it("does not cache when response is not ok", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      await service.checkLicense();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it("does not cache when content-type is not JSON", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
      });
      await service.checkLicense();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it("does not cache when JSON structure is invalid", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ invalid: "structure" }),
      });
      await service.checkLicense();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });
});
