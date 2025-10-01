import { beforeEach, describe, expect, it, vi, type Mocked } from "vitest";

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

const mockEmailValidationProvider = {
  validateEmail: vi.fn(),
  isEmailBlocked: vi.fn(),
} as unknown as Mocked<IEmailValidationProviderService>;

type MockedUserFindByReturnType = Awaited<ReturnType<typeof UserRepository.prototype.findByEmail>>;
const mockUserRepository = {
  findByEmail: vi.fn(),
} as unknown as Mocked<UserRepository>;

describe("EmailValidationService", () => {
  let service: EmailValidationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmailValidationService({
      emailValidationProvider: mockEmailValidationProvider,
      userRepository: mockUserRepository,
    });
  });

  describe("validateEmail - when email is verified in Cal.com", () => {
    it("should skip provider validation", async () => {
      const request: EmailValidationRequest = {
        email: "verified@example.com",
      };

      // Mock UserRepository to return user with emailVerified
      mockUserRepository.findByEmail.mockResolvedValue({
        id: 1,
        email: "verified@example.com",
        emailVerified: new Date("2024-01-01"),
      } as MockedUserFindByReturnType);

      const result = await service.validateEmail(request);

      expect(result).toEqual({
        status: "calcom-verified-email",
      });
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith({
        email: "verified@example.com",
      });
      expect(mockEmailValidationProvider.validateEmail).not.toHaveBeenCalled();
    });

    it("should call provider validation for unverified email (user exists but not verified)", async () => {
      const request: EmailValidationRequest = {
        email: "unverified@example.com",
      };

      const providerResult: EmailValidationResult = {
        status: "valid",
      };

      // Mock UserRepository to return user WITHOUT emailVerified
      mockUserRepository.findByEmail.mockResolvedValue({
        id: 1,
        email: "unverified@example.com",
        emailVerified: null,
      } as MockedUserFindByReturnType);
      mockEmailValidationProvider.validateEmail.mockResolvedValue(providerResult);

      const result = await service.validateEmail(request);

      expect(result).toEqual(providerResult);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith({
        email: "unverified@example.com",
      });
      expect(mockEmailValidationProvider.validateEmail).toHaveBeenCalledWith(request);
    });

    it("should call provider validation for non-existent email", async () => {
      const request: EmailValidationRequest = {
        email: "newuser@example.com",
      };

      const providerResult: EmailValidationResult = {
        status: "valid",
      };

      // Mock UserRepository to return null (user doesn't exist)
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockEmailValidationProvider.validateEmail.mockResolvedValue(providerResult);

      const result = await service.validateEmail(request);

      expect(result).toEqual(providerResult);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith({
        email: "newuser@example.com",
      });
      expect(mockEmailValidationProvider.validateEmail).toHaveBeenCalledWith(request);
    });
  });

  describe("validateEmail - when email is not verified in Cal.com", () => {
    beforeEach(() => {
      // Mock that user doesn't exist or is not verified
      mockUserRepository.findByEmail.mockResolvedValue(null);
    });

    it("should return result from provider when validation succeeds", async () => {
      const request: EmailValidationRequest = {
        email: "test@example.com",
      };

      const providerResult: EmailValidationResult = {
        status: "valid",
      };

      mockEmailValidationProvider.validateEmail.mockResolvedValue(providerResult);

      const result = await service.validateEmail(request);

      expect(result).toEqual(providerResult);
      expect(mockEmailValidationProvider.validateEmail).toHaveBeenCalledWith(request);
    });

    it("should return fallback result when provider throws error", async () => {
      const request: EmailValidationRequest = {
        email: "test@example.com",
      };

      mockEmailValidationProvider.validateEmail.mockRejectedValue(new Error("Provider error"));

      const result = await service.validateEmail(request);

      expect(result).toEqual({
        status: "calcom-provider-fallback",
      });
    });

    it("should return fallback result when provider exceeds 3 second timeout", async () => {
      vi.useFakeTimers();

      try {
        const request: EmailValidationRequest = {
          email: "test@example.com",
        };

        // Mock provider to simulate a hanging request that never completes
        mockEmailValidationProvider.validateEmail.mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return {
            status: "valid",
          };
        });

        const validationPromise = service.validateEmail(request);

        // Create the expectation first to catch the rejection
        const expectPromise = expect(validationPromise).resolves.toEqual({
          status: "calcom-provider-fallback",
        });

        // Advance timers past the 3 second timeout
        await vi.advanceTimersByTimeAsync(3100);

        // Wait for the expectation to resolve
        await expectPromise;
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("isEmailBlocked", () => {
    it("should delegate blocking decision to provider", () => {
      mockEmailValidationProvider.isEmailBlocked.mockReturnValue(true);

      const result = service.isEmailBlocked("invalid");

      expect(result).toBe(true);
      expect(mockEmailValidationProvider.isEmailBlocked).toHaveBeenCalledWith("invalid");
    });

    it("should not block calcom-verified-email status", () => {
      const result = service.isEmailBlocked("calcom-verified-email");

      expect(result).toBe(false);
      expect(mockEmailValidationProvider.isEmailBlocked).not.toHaveBeenCalled();
    });
  });
});
