import { describe, expect, it, vi, beforeEach, type Mocked } from "vitest";

import type { EmailValidationResult } from "../dto/types";
import { EmailValidationCachingProxy } from "./EmailValidationCachingProxy";
import type { IEmailValidationService } from "./IEmailValidationService.interface";

const mockEmailValidationService = {
  validateEmail: vi.fn(),
  isEmailBlocked: vi.fn(),
} as unknown as Mocked<IEmailValidationService>;

const mockRedisService = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  expire: vi.fn(),
  lrange: vi.fn(),
  lpush: vi.fn(),
};

describe("EmailValidationCachingProxy", () => {
  let proxy: EmailValidationCachingProxy;

  beforeEach(() => {
    vi.clearAllMocks();
    proxy = new EmailValidationCachingProxy({
      emailValidationService: mockEmailValidationService,
      redisService: mockRedisService,
    });
  });

  describe("validateEmailGenerator", () => {
    it("should return previously validated email result from cache", async () => {
      const cachedResult: EmailValidationResult = {
        status: "valid",
      };

      mockRedisService.get.mockResolvedValue(cachedResult);

      const generator = proxy.validateEmailGenerator({ email: "cached@example.com" });
      const { value: result } = await generator.next();

      expect(result).toEqual(cachedResult);
      expect(mockRedisService.get).toHaveBeenCalledWith("email_validation:cached@example.com");
      expect(mockEmailValidationService.validateEmail).not.toHaveBeenCalled();
    });

    it("should validate and store result for emails not previously validated", async () => {
      const serviceResult: EmailValidationResult = {
        status: "invalid",
      };

      mockRedisService.get.mockResolvedValue(null);
      mockEmailValidationService.validateEmail.mockResolvedValue(serviceResult);

      const generator = proxy.validateEmailGenerator({ email: "test@example.com" });

      // First call returns null (cache miss, generator yields)
      const { value: cacheResult } = await generator.next();
      expect(cacheResult).toBeNull();

      // Second call returns service result
      const { value: result } = await generator.next();

      expect(result).toEqual(serviceResult);
      expect(mockRedisService.get).toHaveBeenCalledWith("email_validation:test@example.com");
      expect(mockEmailValidationService.validateEmail).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(mockRedisService.set).toHaveBeenCalledWith("email_validation:test@example.com", serviceResult, {
        ttl: 7_200_000,
      });
    });

    it("should treat email addresses case-insensitively when caching results", async () => {
      const serviceResult: EmailValidationResult = {
        status: "valid",
      };

      mockRedisService.get.mockResolvedValue(null);
      mockEmailValidationService.validateEmail.mockResolvedValue(serviceResult);

      const generator = proxy.validateEmailGenerator({ email: "Test@Example.com" });

      // First call returns null (cache miss)
      await generator.next();
      // Second call triggers service call and caching
      await generator.next();

      expect(mockRedisService.get).toHaveBeenCalledWith("email_validation:test@example.com");
      expect(mockRedisService.set).toHaveBeenCalledWith("email_validation:test@example.com", serviceResult, {
        ttl: 7_200_000,
      });
    });

    it("should return calcom-cache-fallback status when cache is unavailable for reading", async () => {
      mockRedisService.get.mockRejectedValue(new Error("Redis connection error"));

      const generator = proxy.validateEmailGenerator({ email: "test@example.com" });
      const { value: result } = await generator.next();

      expect(result).toEqual({
        status: "calcom-cache-fallback",
      });
      expect(mockEmailValidationService.validateEmail).not.toHaveBeenCalled();
    });

    it("should return calcom-cache-fallback status when cache is unavailable for writing", async () => {
      const serviceResult: EmailValidationResult = {
        status: "valid",
      };

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockRejectedValue(new Error("Cache set error"));
      mockEmailValidationService.validateEmail.mockResolvedValue(serviceResult);

      const generator = proxy.validateEmailGenerator({ email: "test@example.com" });

      // First call returns null (cache miss, generator yields)
      const { value: cacheResult } = await generator.next();
      expect(cacheResult).toBeNull();

      // Second call triggers service call, but cache set fails
      const { value: result } = await generator.next();

      expect(result).toEqual({
        status: "calcom-cache-fallback",
      });
      expect(mockEmailValidationService.validateEmail).toHaveBeenCalledWith({
        email: "test@example.com",
      });
    });

    it("should include IP address in validation when provided", async () => {
      const serviceResult: EmailValidationResult = {
        status: "valid",
      };

      mockRedisService.get.mockResolvedValue(null);
      mockEmailValidationService.validateEmail.mockResolvedValue(serviceResult);

      const generator = proxy.validateEmailGenerator({ email: "test@example.com", ipAddress: "192.168.1.1" });

      // First call returns null (cache miss)
      await generator.next();
      // Second call triggers service call
      await generator.next();

      expect(mockEmailValidationService.validateEmail).toHaveBeenCalledWith({
        email: "test@example.com",
        ipAddress: "192.168.1.1",
      });
    });
  });

  describe("isEmailBlocked", () => {
    it("should not block emails with calcom-cache-fallback status", () => {
      const result = proxy.isEmailBlocked("calcom-cache-fallback");

      expect(result).toBe(false);
      expect(mockEmailValidationService.isEmailBlocked).not.toHaveBeenCalled();
    });

    it("should delegate blocking decision to service for unhandled statuses", () => {
      mockEmailValidationService.isEmailBlocked.mockReturnValue(true);
      const result = proxy.isEmailBlocked("invalid");
      expect(result).toBe(true);
      expect(mockEmailValidationService.isEmailBlocked).toHaveBeenCalledWith("invalid");
    });
  });
});
