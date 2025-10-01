import type { Logger } from "tslog";
import { describe, expect, it, vi, beforeEach } from "vitest";

import type { EmailValidationResult } from "../dto/types";
import { EmailValidationCachingProxy } from "./EmailValidationCachingProxy";
import type { IEmailValidationService } from "./IEmailValidationService.interface";

// Mock dependencies
const mockEmailValidationService = {
  validateEmail: vi.fn(),
} as unknown as IEmailValidationService;

const mockRedisService = {
  get: vi.fn(),
  set: vi.fn(),
};

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as Logger<unknown>;

describe("EmailValidationCachingProxy", () => {
  let proxy: EmailValidationCachingProxy;

  beforeEach(() => {
    vi.clearAllMocks();
    proxy = new EmailValidationCachingProxy({
      emailValidationService: mockEmailValidationService,
      redisService: mockRedisService,
    });
  });

  describe("validateEmail", () => {
    it("should return cached result when available", async () => {
      const cachedResult: EmailValidationResult = {
        email: "cached@example.com",
        status: "valid",
        processedAt: "2023-12-07T10:00:00.000Z",
      };

      mockRedisService.get.mockResolvedValue(cachedResult);

      const result = await proxy.validateEmail({ email: "cached@example.com" });

      expect(result).toEqual(cachedResult);
      expect(mockRedisService.get).toHaveBeenCalledWith("email_validation:cached@example.com");
      expect(mockEmailValidationService.validateEmail).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith("Email validation cache hit", {
        email: "cached@example.com",
        status: "valid",
      });
    });

    it("should call service and cache result on cache miss", async () => {
      const serviceResult: EmailValidationResult = {
        email: "test@example.com",
        status: "invalid",
        processedAt: "2023-12-07T10:00:00.000Z",
      };

      mockRedisService.get.mockResolvedValue(null);
      mockEmailValidationService.validateEmail.mockResolvedValue(serviceResult);

      const result = await proxy.validateEmail({ email: "test@example.com" });

      expect(result).toEqual(serviceResult);
      expect(mockRedisService.get).toHaveBeenCalledWith("email_validation:test@example.com");
      expect(mockEmailValidationService.validateEmail).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(mockRedisService.set).toHaveBeenCalledWith("email_validation:test@example.com", serviceResult, {
        ttl: 7_200_000,
      });
      expect(mockLogger.info).toHaveBeenCalledWith("Email validation cache miss, calling service", {
        email: "test@example.com",
      });
      expect(mockLogger.info).toHaveBeenCalledWith("Email validation result cached", {
        email: "test@example.com",
        status: "invalid",
        ttl: 7_200_000,
      });
    });

    it("should normalize email to lowercase in cache key", async () => {
      const serviceResult: EmailValidationResult = {
        email: "Test@Example.com",
        status: "valid",
        processedAt: "2023-12-07T10:00:00.000Z",
      };

      mockRedisService.get.mockResolvedValue(null);
      mockEmailValidationService.validateEmail.mockResolvedValue(serviceResult);

      await proxy.validateEmail({ email: "Test@Example.com" });

      expect(mockRedisService.get).toHaveBeenCalledWith("email_validation:test@example.com");
      expect(mockRedisService.set).toHaveBeenCalledWith("email_validation:test@example.com", serviceResult, {
        ttl: 7_200_000,
      });
    });

    it("should fallback to service when cache fails", async () => {
      const serviceResult: EmailValidationResult = {
        email: "test@example.com",
        status: "valid",
        processedAt: "2023-12-07T10:00:00.000Z",
      };

      mockRedisService.get.mockRejectedValue(new Error("Redis connection error"));
      mockEmailValidationService.validateEmail.mockResolvedValue(serviceResult);

      const result = await proxy.validateEmail({ email: "test@example.com" });

      expect(result).toEqual(serviceResult);
      expect(mockLogger.warn).toHaveBeenCalledWith("Email validation cache error, falling back to service", {
        email: "test@example.com",
        error: "Redis connection error",
      });
      expect(mockEmailValidationService.validateEmail).toHaveBeenCalledWith({
        email: "test@example.com",
      });
    });

    it("should fallback to service when cache set fails", async () => {
      const serviceResult: EmailValidationResult = {
        email: "test@example.com",
        status: "valid",
        processedAt: "2023-12-07T10:00:00.000Z",
      };

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockRejectedValue(new Error("Cache set error"));
      mockEmailValidationService.validateEmail.mockResolvedValue(serviceResult);

      const result = await proxy.validateEmail({ email: "test@example.com" });

      expect(result).toEqual(serviceResult);
      expect(mockEmailValidationService.validateEmail).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(mockLogger.warn).toHaveBeenCalledWith("Email validation cache error, falling back to service", {
        email: "test@example.com",
        error: "Cache set error",
      });
    });

    it("should handle ipAddress parameter correctly", async () => {
      const serviceResult: EmailValidationResult = {
        email: "test@example.com",
        status: "valid",
        processedAt: "2023-12-07T10:00:00.000Z",
      };

      mockRedisService.get.mockResolvedValue(null);
      mockEmailValidationService.validateEmail.mockResolvedValue(serviceResult);

      await proxy.validateEmail({ email: "test@example.com", ipAddress: "192.168.1.1" });

      expect(mockEmailValidationService.validateEmail).toHaveBeenCalledWith({
        email: "test@example.com",
        ipAddress: "192.168.1.1",
      });
    });
  });
});
