import { createHash } from "crypto";
import { beforeEach, describe, expect, it, vi, type Mocked } from "vitest";

import type { IRedisService } from "@calcom/features/redis/IRedisService";
import type { UserRepository } from "@calcom/lib/server/repository/user";

import type { EmailValidationRequest, EmailValidationResult } from "../dto/types";
import { EmailValidationService } from "./EmailValidationService";
import type { IEmailValidationProviderService } from "./IEmailValidationProviderService.interface";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

/**
 * Helper function to generate expected cache key for tests.
 * Must match the hashing implementation in EmailValidationService.
 */
const getExpectedCacheKey = (email: string): string => {
  const hash = createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
  return `email_validation:${hash}`;
};

const mockEmailValidationProvider = {
  validateEmail: vi.fn(),
} as unknown as Mocked<IEmailValidationProviderService>;

type MockedUserFindByReturnType = Awaited<ReturnType<typeof UserRepository.prototype.findByEmail>>;
const mockUserRepository = {
  findByEmail: vi.fn(),
} as unknown as Mocked<UserRepository>;

const mockRedisService = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  expire: vi.fn(),
  lrange: vi.fn(),
  lpush: vi.fn(),
} as unknown as Mocked<IRedisService>;

describe("EmailValidationService", () => {
  let service: EmailValidationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmailValidationService({
      emailValidationProvider: mockEmailValidationProvider,
      userRepository: mockUserRepository,
      redisService: mockRedisService,
    });
  });

  describe("validateWithCalcom", () => {
    describe("results from cache", () => {
      it("should use cached valid result and return shouldBlock=false and continueWithProvider=false for status calcom-verified-email", async () => {
        const email = "cached-valid@example.com";

        const cachedResult = {
          status: "calcom-verified-email",
        };

        mockRedisService.get.mockResolvedValue(cachedResult);

        const response = await service.validateWithCalcom(email);

        expect(response).toEqual({
          shouldBlock: false,
          continueWithProvider: false,
        });
        expect(mockRedisService.get).toHaveBeenCalledWith(getExpectedCacheKey(email));
        expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
      });

      it("should ignore cached result if it has some unknown status and instead check the database", async () => {
        const email = "cached-valid@example.com";

        const cachedResult = {
          status: "some-unknown-status",
        };

        mockRedisService.get.mockResolvedValue(cachedResult);
        mockUserRepository.findByEmail.mockResolvedValue({
          id: 1,
          email: email,
          emailVerified: null,
        } as MockedUserFindByReturnType);

        const response = await service.validateWithCalcom(email);

        expect(response).toEqual({
          shouldBlock: false,
          continueWithProvider: true,
        });
        expect(mockRedisService.get).toHaveBeenCalledWith(getExpectedCacheKey(email));
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith({ email });
        expect(mockRedisService.set).not.toHaveBeenCalled();
      });

      it("should use cached `invalid` status and return shouldBlock=true and continueWithProvider=false", async () => {
        const email = "cached-invalid@example.com";

        const cachedResult = {
          status: "invalid",
        };

        mockRedisService.get.mockResolvedValue(cachedResult);

        const response = await service.validateWithCalcom(email);

        expect(response).toEqual({
          shouldBlock: true,
          continueWithProvider: false,
        });
        expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
      });

      it("should fetch correct cache even when email is in different case", async () => {
        const email = "Test@Example.COM";

        const cachedResult = {
          status: "valid",
        };

        mockRedisService.get.mockResolvedValue(cachedResult);

        await service.validateWithCalcom(email);

        // Should be hashed version of lowercase email
        expect(mockRedisService.get).toHaveBeenCalledWith(getExpectedCacheKey(email));
      });
    });

    describe("results from Cal.com DB", () => {
      beforeEach(() => {
        // Mock cache miss
        mockRedisService.get.mockResolvedValue(null);
      });

      it("should return shouldBlock=false and continueWithProvider=true when email not verified in Cal.com. It must not cache the result", async () => {
        const email = "unverified@example.com";

        // Mock user not verified
        mockUserRepository.findByEmail.mockResolvedValue({
          id: 1,
          email: email,
          emailVerified: null,
        } as MockedUserFindByReturnType);

        const response = await service.validateWithCalcom(email);

        expect(response).toEqual({
          shouldBlock: false,
          continueWithProvider: true,
        });
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith({ email });
        expect(mockRedisService.set).not.toHaveBeenCalled();
      });

      it("should return shouldBlock=false and continueWithProvider=true when user doesn't exist. It must not cache the result", async () => {
        const email = "nonexistent@example.com";

        mockUserRepository.findByEmail.mockResolvedValue(null);

        const response = await service.validateWithCalcom(email);

        expect(response).toEqual({
          shouldBlock: false,
          continueWithProvider: true,
        });
        expect(mockRedisService.set).not.toHaveBeenCalled();
      });

      it("should return shouldBlock=false and continueWithProvider=false when email is verified by Cal.com. Also caches the result", async () => {
        const email = "verified@example.com";

        // Mock Cal.com verified user
        mockUserRepository.findByEmail.mockResolvedValue({
          id: 1,
          email: email,
          emailVerified: new Date("2024-01-01"),
        } as MockedUserFindByReturnType);

        const response = await service.validateWithCalcom(email);

        expect(response).toEqual({
          shouldBlock: false,
          continueWithProvider: false,
        });
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith({ email });
        expect(mockRedisService.set).toHaveBeenCalledWith(
          getExpectedCacheKey(email),
          { status: "calcom-verified-email" },
          { ttl: 24 * 3600 * 1000 }
        );
      });
    });

    describe("Error handling", () => {
      it("should not continue with provider when cache read fails and user is not verified (avoid hammering)", async () => {
        const email = "cache-error-unverified@example.com";

        mockRedisService.get.mockRejectedValue(new Error("Redis connection error"));
        mockUserRepository.findByEmail.mockResolvedValue({
          id: 1,
          email: email,
          emailVerified: null,
        } as MockedUserFindByReturnType);

        const response = await service.validateWithCalcom(email);

        expect(response).toEqual({
          shouldBlock: false,
          continueWithProvider: false, // Don't hammer provider when cache is down
        });
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith({ email });
      });

      it("should not hammer provider when cache miss and DB check fails", async () => {
        const email = "cache-and-db-error@example.com";

        mockUserRepository.findByEmail.mockRejectedValue(new Error("DB connection error"));

        const response = await service.validateWithCalcom(email);

        expect(response).toEqual({
          shouldBlock: false,
          continueWithProvider: false, // Don't hammer provider when DB is down
        });
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith({ email });
      });

      it("should still work if cache set fails in validateWithCalcom", async () => {
        const email = "cache-set-error@example.com";

        mockRedisService.get.mockResolvedValue(null);
        mockRedisService.set.mockRejectedValue(new Error("Cache set error"));
        mockUserRepository.findByEmail.mockResolvedValue({
          id: 1,
          email: email,
          emailVerified: new Date(),
        } as MockedUserFindByReturnType);

        const response = await service.validateWithCalcom(email);

        expect(response).not.toBeNull();
        expect(response?.shouldBlock).toBe(false);
      });
    });
  });

  describe("validateWithProvider", () => {
    it("should return shouldBlock=false when provider returns valid status. Also caches the result", async () => {
      const request: EmailValidationRequest = {
        email: "new-user@example.com",
      };

      const providerResult: EmailValidationResult = {
        status: "valid",
      };

      mockEmailValidationProvider.validateEmail.mockResolvedValue(providerResult);

      const response = await service.validateWithProvider({ request, skipCache: true });

      expect(response).toEqual({
        shouldBlock: false,
      });
      expect(mockRedisService.get).not.toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalledWith(getExpectedCacheKey(request.email), providerResult, {
        ttl: 24 * 3600 * 1000,
      });
    });

    it("should return shouldBlock=true when provider returns `invalid` status. Also caches the result", async () => {
      const request: EmailValidationRequest = {
        email: "invalid@example.com",
      };

      const providerResult: EmailValidationResult = {
        status: "invalid",
      };

      mockEmailValidationProvider.validateEmail.mockResolvedValue(providerResult);

      const response = await service.validateWithProvider({ request, skipCache: true });

      expect(response).toEqual({
        shouldBlock: true,
      });
      expect(mockRedisService.get).not.toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalledWith(getExpectedCacheKey(request.email), providerResult, {
        ttl: 24 * 3600 * 1000,
      });
    });

    describe("Error handling", () => {
      it("should return shouldBlock=false when provider times out (fallback). Also caches the result for a few minutes to avoid hammering the provider", async () => {
        vi.useFakeTimers();

        const request: EmailValidationRequest = {
          email: "timeout@example.com",
        };

        // Mock provider to never resolve
        mockEmailValidationProvider.validateEmail.mockImplementation(() => new Promise(() => {}));

        const validationPromise = service.validateWithProvider({ request, skipCache: true });

        // Advance time past timeout
        await vi.advanceTimersByTimeAsync(3500);

        const response = await validationPromise;

        expect(response).toEqual({
          shouldBlock: false,
        });
        expect(mockRedisService.get).not.toHaveBeenCalled(); // No cache check
        expect(mockRedisService.set).toHaveBeenCalledWith(
          getExpectedCacheKey(request.email),
          { status: "calcom-provider-fallback" },
          { ttl: 5 * 60 * 1000 }
        );
        vi.useRealTimers();
      }, 10000);

      it("should return shouldBlock=false when provider is down (fallback). Also caches the result for a few minutes to avoid hammering the provider", async () => {
        const request: EmailValidationRequest = {
          email: "provider-error@example.com",
        };

        mockEmailValidationProvider.validateEmail.mockRejectedValue(new Error("Provider API error"));

        const response = await service.validateWithProvider({ request, skipCache: true });

        expect(response).toEqual({
          shouldBlock: false,
        });
        expect(mockRedisService.get).not.toHaveBeenCalled();

        // Expect calcom-provider-fallback status to be cached for a few mins to avoid hammering the provider
        expect(mockRedisService.set).toHaveBeenCalledWith(
          getExpectedCacheKey(request.email),
          { status: "calcom-provider-fallback" },
          { ttl: 5 * 60 * 1000 }
        );
      });
    });
  });
});
