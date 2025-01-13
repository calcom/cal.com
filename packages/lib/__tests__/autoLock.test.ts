import type { RatelimitResponse } from "@unkey/ratelimit";
import crypto from "crypto";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import { hashAPIKey } from "@calcom/features/ee/api-keys/lib/apiKeys";
import { RedisService } from "@calcom/features/redis/RedisService";
import prisma from "@calcom/prisma";

import { handleAutoLock } from "../autoLock";

// Mock the dependencies
vi.mock("@calcom/features/redis/RedisService");
vi.mock("@calcom/features/ee/api-keys/lib/apiKeys", () => ({
  hashAPIKey: vi.fn((key) => `hashed_${key}`),
}));
vi.mock("@calcom/prisma", () => ({
  default: {
    user: {
      update: vi.fn(),
    },
    apiKey: {
      findUnique: vi.fn(),
    },
  },
}));

describe("autoLock", () => {
  const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    expire: vi.fn(),
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    vi.mocked(RedisService).mockImplementation(() => mockRedis as any);

    // Mock environment variables
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    process.env.UPSTASH_REDIS_REST_URL = "test-url";
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
  });

  describe("handleAutoLock", () => {
    it("should return early if Upstash env variables are not set", async () => {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const rateLimitResponse: RatelimitResponse = {
        success: false,
        remaining: 0,
        limit: 5,
        reset: 0,
      };

      await handleAutoLock({
        identifier: "test@example.com",
        identifierType: "email",
        rateLimitResponse,
      });
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it("should handle identifier with keyword correctly", async () => {
      const rateLimitResponse: RatelimitResponse = {
        success: false,
        remaining: 0,
        limit: 5,
        reset: 0,
      };

      mockRedis.get.mockResolvedValue("0");

      await handleAutoLock({
        identifier: "addSecondaryEmail.test@example.com",
        identifierType: "email",
        rateLimitResponse,
        identifierKeyword: "addSecondaryEmail",
      });

      expect(mockRedis.get).toHaveBeenCalledWith("autolock:email:addSecondaryEmail:test@example.com.count");
    });

    it("should increment counter when below threshold", async () => {
      const rateLimitResponse: RatelimitResponse = {
        success: false,
        remaining: 0,
        limit: 5,
        reset: 0,
      };

      mockRedis.get.mockResolvedValue("2");

      await handleAutoLock({
        identifier: "test@example.com",
        identifierType: "email",
        rateLimitResponse,
      });

      expect(mockRedis.set).toHaveBeenCalledWith("autolock:email:test@example.com.count", "3");
      expect(mockRedis.expire).toHaveBeenCalledWith("autolock:email:test@example.com.count", 3600);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("should lock user when threshold is reached", async () => {
      const rateLimitResponse: RatelimitResponse = {
        success: false,
        remaining: 0,
        limit: 5,
        reset: 0,
      };

      mockRedis.get.mockResolvedValue("4");

      await handleAutoLock({
        identifier: "test@example.com",
        identifierType: "email",
        rateLimitResponse,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        data: { locked: true },
      });
      expect(mockRedis.del).toHaveBeenCalledWith("autolock:email:test@example.com.count");
    });

    it("should respect custom threshold and duration", async () => {
      const rateLimitResponse: RatelimitResponse = {
        success: false,
        remaining: 0,
        limit: 5,
        reset: 0,
      };

      mockRedis.get.mockResolvedValue("1");

      await handleAutoLock({
        identifier: "test@example.com",
        identifierType: "email",
        rateLimitResponse,
        autolockThreshold: 3,
        autolockDuration: 30 * 60 * 1000, // 30 minutes
      });

      expect(mockRedis.set).toHaveBeenCalledWith("autolock:email:test@example.com.count", "2");
      expect(mockRedis.expire).toHaveBeenCalledWith("autolock:email:test@example.com.count", 1800);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("should lock IP address correctly", async () => {
      const rateLimitResponse: RatelimitResponse = {
        success: false,
        remaining: 0,
        limit: 5,
        reset: 0,
      };

      mockRedis.get.mockResolvedValue("4");
      const testIp = "192.168.1.1";
      const hashedIp = crypto.createHash("sha256").update(testIp).digest("hex");

      await handleAutoLock({
        identifier: testIp,
        identifierType: "ip",
        rateLimitResponse,
      });

      expect(mockRedis.set).toHaveBeenCalledWith(`ip:${hashedIp}`, "locked");
      expect(mockRedis.expire).toHaveBeenCalledWith(`ip:${hashedIp}`, 3600);
    });

    it("should lock API key and associated user", async () => {
      const rateLimitResponse: RatelimitResponse = {
        success: false,
        remaining: 0,
        limit: 5,
        reset: 0,
      };

      mockRedis.get.mockResolvedValue("4");
      const testApiKey = "test_api_key_123";

      // Mock API key lookup
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
        hashedKey: `hashed_${testApiKey}`,
        user: { id: 456 },
      } as any);

      await handleAutoLock({
        identifier: testApiKey,
        identifierType: "apiKey",
        rateLimitResponse,
      });

      // Verify the API key was hashed
      expect(hashAPIKey).toHaveBeenCalledWith(testApiKey);

      // Verify the associated user was locked
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 456 },
        data: { locked: true },
      });
    });

    it("should throw error when API key has no associated user", async () => {
      const rateLimitResponse: RatelimitResponse = {
        success: false,
        remaining: 0,
        limit: 5,
        reset: 0,
      };

      mockRedis.get.mockResolvedValue("4"); // Over threshold to trigger lock
      const testApiKey = "test_api_key_123";

      // Mock API key lookup with no user
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(null);

      // Expect handleAutoLock to throw the error from lockUser
      await expect(async () => {
        await handleAutoLock({
          identifier: testApiKey,
          identifierType: "apiKey",
          rateLimitResponse,
        });
      }).rejects.toThrow("No user found for this API key.");
    });

    it("should increment counter for IP address", async () => {
      const rateLimitResponse: RatelimitResponse = {
        success: false,
        remaining: 0,
        limit: 5,
        reset: 0,
      };

      mockRedis.get.mockResolvedValue("2");
      const testIp = "192.168.1.1";
      const hashedIp = crypto.createHash("sha256").update(testIp).digest("hex");

      await handleAutoLock({
        identifier: testIp,
        identifierType: "ip",
        rateLimitResponse,
      });

      expect(mockRedis.set).toHaveBeenCalledWith(`autolock:ip:${hashedIp}.count`, "3");
      expect(mockRedis.expire).toHaveBeenCalledWith(`autolock:ip:${hashedIp}.count`, 3600);
    });
  });

  describe("lockUser", () => {
    it("should lock user by email", async () => {
      const rateLimitResponse: RatelimitResponse = {
        success: false,
        remaining: 0,
        limit: 5,
        reset: 0,
      };

      mockRedis.get.mockResolvedValue("4");

      await handleAutoLock({
        identifier: "test@example.com",
        identifierType: "email",
        rateLimitResponse,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        data: { locked: true },
      });
    });

    it("should lock user by userId", async () => {
      const rateLimitResponse: RatelimitResponse = {
        success: false,
        remaining: 0,
        limit: 5,
        reset: 0,
      };

      mockRedis.get.mockResolvedValue("4");

      await handleAutoLock({
        identifier: "123",
        identifierType: "userId",
        rateLimitResponse,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 123 },
        data: { locked: true },
      });
    });

    it("should not perform database updates for IP locks", async () => {
      const rateLimitResponse: RatelimitResponse = {
        success: false,
        remaining: 0,
        limit: 5,
        reset: 0,
      };

      mockRedis.get.mockResolvedValue("4");

      await handleAutoLock({
        identifier: "192.168.1.1",
        identifierType: "ip",
        rateLimitResponse,
      });

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
