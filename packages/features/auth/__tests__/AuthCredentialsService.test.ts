import { beforeEach, describe, expect, it, vi } from "vitest";

import { IdentityProvider, UserPermissionRole } from "@calcom/prisma/enums";

import { ErrorCode } from "../lib/ErrorCode";
import type { IAuthCredentialsServiceDeps } from "../services/AuthCredentialsService";
import { AuthCredentialsService } from "../services/AuthCredentialsService";

describe("AuthCredentialsService", () => {
  let service: AuthCredentialsService;
  let mockDeps: IAuthCredentialsServiceDeps;

  const createMockUser = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    email: "test@example.com",
    name: "Test User",
    username: "testuser",
    role: UserPermissionRole.USER,
    locked: false,
    identityProvider: IdentityProvider.CAL,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    backupCodes: null,
    password: { hash: "$2a$10$hashedpassword" },
    allProfiles: [{ id: 1, upId: "usr_123", username: "testuser" }],
    teams: [],
    ...overrides,
  });

  beforeEach(() => {
    mockDeps = {
      userRepository: {
        findByEmailAndIncludeProfilesAndPassword: vi.fn(),
      } as any,
      checkRateLimitAndThrowError: vi.fn().mockResolvedValue(undefined),
      hashEmail: vi.fn((email: string) => `hashed_${email}`),
      verifyPassword: vi.fn(),
      prisma: {
        user: {
          update: vi.fn(),
        },
      } as any,
      log: {
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
      } as any,
    };
    service = new AuthCredentialsService(mockDeps);
  });

  describe("deny-first checks", () => {
    it("throws InternalServerError when credentials are missing", async () => {
      await expect(service.authorize(undefined)).rejects.toThrow(ErrorCode.InternalServerError);
    });

    it("throws IncorrectEmailPassword when user not found", async () => {
      (mockDeps.userRepository.findByEmailAndIncludeProfilesAndPassword as any).mockResolvedValue(null);

      await expect(
        service.authorize({ email: "nobody@test.com", password: "pass", totpCode: "", backupCode: "" })
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
    });

    it("throws UserAccountLocked when user is locked", async () => {
      const lockedUser = createMockUser({ locked: true });
      (mockDeps.userRepository.findByEmailAndIncludeProfilesAndPassword as any).mockResolvedValue(
        lockedUser
      );

      await expect(
        service.authorize({ email: "test@example.com", password: "pass", totpCode: "", backupCode: "" })
      ).rejects.toThrow(ErrorCode.UserAccountLocked);
    });

    it("throws IncorrectEmailPassword when user has no password hash", async () => {
      const noPasswordUser = createMockUser({ password: null });
      (mockDeps.userRepository.findByEmailAndIncludeProfilesAndPassword as any).mockResolvedValue(
        noPasswordUser
      );

      await expect(
        service.authorize({ email: "test@example.com", password: "pass", totpCode: "", backupCode: "" })
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
    });

    it("throws IncorrectEmailPassword when password is wrong", async () => {
      const user = createMockUser();
      (mockDeps.userRepository.findByEmailAndIncludeProfilesAndPassword as any).mockResolvedValue(user);
      (mockDeps.verifyPassword as any).mockResolvedValue(false);

      await expect(
        service.authorize({ email: "test@example.com", password: "wrong", totpCode: "", backupCode: "" })
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
    });
  });

  describe("successful authentication", () => {
    it("returns user presenter when password is correct and no 2FA", async () => {
      const user = createMockUser();
      (mockDeps.userRepository.findByEmailAndIncludeProfilesAndPassword as any).mockResolvedValue(user);
      (mockDeps.verifyPassword as any).mockResolvedValue(true);

      const result = await service.authorize({
        email: "test@example.com",
        password: "correct",
        totpCode: "",
        backupCode: "",
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.email).toBe("test@example.com");
    });
  });
});
