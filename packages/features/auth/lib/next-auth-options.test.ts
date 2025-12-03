import type { User } from "next-auth";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { IdentityProvider, UserPermissionRole } from "@calcom/prisma/enums";

import { ErrorCode } from "./ErrorCode";

// Mock dependencies
const mockPrismaUpdate = vi.fn();

vi.mock("@calcom/prisma", () => ({
  prisma: {
    user: {
      update: mockPrismaUpdate,
    },
  },
  default: {
    user: {
      update: mockPrismaUpdate,
    },
  },
}));

const mockFindByEmailAndIncludeProfilesAndPassword = vi.fn();

vi.mock("@calcom/features/users/repositories/UserRepository", () => {
  return {
    UserRepository: vi.fn().mockImplementation(() => ({
      findByEmailAndIncludeProfilesAndPassword: mockFindByEmailAndIncludeProfilesAndPassword,
    })),
  };
});

vi.mock("./verifyPassword", () => ({
  verifyPassword: vi.fn(),
}));

vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({
  checkRateLimitAndThrowError: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/lib/server/PiiHasher", () => ({
  hashEmail: vi.fn((email: string) => `hashed_${email}`),
}));

const mockTotpAuthenticatorCheck = vi.fn();

vi.mock("@calcom/lib/totp", () => ({
  totpAuthenticatorCheck: mockTotpAuthenticatorCheck,
}));

vi.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: vi.fn(),
  symmetricEncrypt: vi.fn(),
}));

vi.mock("@calcom/lib/auth/isPasswordValid", () => ({
  isPasswordValid: vi.fn(),
}));

vi.mock("@calcom/lib/env", () => ({
  isENVDev: false,
}));

vi.mock("@calcom/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
  return {
    ...actual,
    IS_TEAM_BILLING_ENABLED: false,
    ENABLE_PROFILE_SWITCHER: false,
    WEBAPP_URL: "http://localhost:3000",
  };
});

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    })),
  },
}));

vi.mock("@calcom/lib/safeStringify", () => ({
  safeStringify: vi.fn((obj) => JSON.stringify(obj)),
}));

vi.mock("./next-auth-custom-adapter", () => ({
  default: vi.fn(() => ({
    linkAccount: vi.fn(),
  })),
}));

vi.mock("@calcom/features/profile/repositories/ProfileRepository", () => ({
  ProfileRepository: {
    findAllProfilesForUserIncludingMovedUser: vi.fn(),
    findByUpIdWithAuth: vi.fn(),
  },
}));

describe("CredentialsProvider authorize", () => {
  let authorizeCredentials: typeof import("./next-auth-options").authorizeCredentials;
  let verifyPassword: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockFindByEmailAndIncludeProfilesAndPassword.mockReset();
    mockPrismaUpdate.mockReset();
    mockTotpAuthenticatorCheck.mockReset();

    const verifyPasswordModule = await import("./verifyPassword");
    verifyPassword = verifyPasswordModule.verifyPassword;

    // Import the exported authorize function directly
    const authModule = await import("./next-auth-options");
    authorizeCredentials = authModule.authorizeCredentials;
  });

  const createMockUser = (overrides: Partial<any> = {}) => ({
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
    password: {
      hash: "$2a$10$hashedpassword",
    },
    allProfiles: [
      {
        id: 1,
        upId: "usr_123",
        username: "testuser",
      },
    ],
    teams: [],
    ...overrides,
  });

  describe("Password validation", () => {
    it("should throw error when user has no password hash (regardless of identity provider)", async () => {
      const mockUser = createMockUser({
        password: null,
        identityProvider: IdentityProvider.CAL,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "password123",
        } as any)
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
    });

    it("should throw error when user has no password hash even with TOTP code provided", async () => {
      const mockUser = createMockUser({
        password: null,
        identityProvider: IdentityProvider.CAL,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "password123",
          totpCode: "123456",
        } as any)
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
    });
  });

  describe("Password verification", () => {
    it("should throw error when incorrect password is provided", async () => {
      const mockUser = createMockUser();
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(false);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "wrongpassword",
        } as any)
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);

      expect(verifyPassword).toHaveBeenCalledWith("wrongpassword", mockUser.password.hash);
    });
  });

  describe("Two-Factor Authentication - TOTP", () => {
    beforeEach(() => {
      process.env.CALENDSO_ENCRYPTION_KEY = "test_encryption_key_32_chars!!";
    });

    afterEach(() => {
      delete process.env.CALENDSO_ENCRYPTION_KEY;
    });

    it("should require TOTP code when two-factor is enabled", async () => {
      const mockUser = createMockUser({
        twoFactorEnabled: true,
        twoFactorSecret: "encrypted_secret",
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "correctpassword",
        } as any)
      ).rejects.toThrow(ErrorCode.SecondFactorRequired);
    });

    it("should throw error when TOTP code is invalid", async () => {
      const { symmetricDecrypt } = await import("@calcom/lib/crypto");

      const mockUser = createMockUser({
        twoFactorEnabled: true,
        twoFactorSecret: "encrypted_secret",
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);
      vi.mocked(symmetricDecrypt).mockReturnValue("decrypted_secret_32_chars_long!!");
      mockTotpAuthenticatorCheck.mockReturnValue(false);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "correctpassword",
          totpCode: "wrongcode",
        } as any)
      ).rejects.toThrow(ErrorCode.IncorrectTwoFactorCode);

      expect(mockTotpAuthenticatorCheck).toHaveBeenCalledWith(
        "wrongcode",
        "decrypted_secret_32_chars_long!!"
      );
    });

    it("should throw error when encryption key is missing", async () => {
      delete process.env.CALENDSO_ENCRYPTION_KEY;

      const mockUser = createMockUser({
        twoFactorEnabled: true,
        twoFactorSecret: "encrypted_secret",
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "correctpassword",
          totpCode: "123456",
        } as any)
      ).rejects.toThrow(ErrorCode.InternalServerError);
    });

    it("should throw error when twoFactorSecret is missing", async () => {
      const mockUser = createMockUser({
        twoFactorEnabled: true,
        twoFactorSecret: null,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "correctpassword",
          totpCode: "123456",
        } as any)
      ).rejects.toThrow(ErrorCode.InternalServerError);
    });

    it("should throw error when secret decryption fails (invalid length)", async () => {
      const { symmetricDecrypt } = await import("@calcom/lib/crypto");

      const mockUser = createMockUser({
        twoFactorEnabled: true,
        twoFactorSecret: "encrypted_secret",
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);
      vi.mocked(symmetricDecrypt).mockReturnValue("short_secret"); // Not 32 chars

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "correctpassword",
          totpCode: "123456",
        } as any)
      ).rejects.toThrow(ErrorCode.InternalServerError);
    });
  });

  describe("Backup Codes", () => {
    beforeEach(() => {
      process.env.CALENDSO_ENCRYPTION_KEY = "test_encryption_key_32_chars!!";
    });

    afterEach(() => {
      delete process.env.CALENDSO_ENCRYPTION_KEY;
    });

    it("should throw error when backup code is invalid", async () => {
      const { symmetricDecrypt } = await import("@calcom/lib/crypto");

      const mockUser = createMockUser({
        twoFactorEnabled: true,
        backupCodes: "encrypted_backup_codes",
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);
      vi.mocked(symmetricDecrypt).mockReturnValue(JSON.stringify(["backupcode1", "backupcode2"]));

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "correctpassword",
          backupCode: "invalidcode",
        } as any)
      ).rejects.toThrow(ErrorCode.IncorrectBackupCode);
    });

    it("should throw error when backup codes are missing", async () => {
      const mockUser = createMockUser({
        twoFactorEnabled: true,
        backupCodes: null,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "correctpassword",
          backupCode: "backupcode1",
        } as any)
      ).rejects.toThrow(ErrorCode.MissingBackupCodes);
    });

    it("should throw error when encryption key is missing for backup codes", async () => {
      delete process.env.CALENDSO_ENCRYPTION_KEY;

      const mockUser = createMockUser({
        twoFactorEnabled: true,
        backupCodes: "encrypted_backup_codes",
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "correctpassword",
          backupCode: "backupcode1",
        } as any)
      ).rejects.toThrow(ErrorCode.InternalServerError);
    });

    it("should delete used backup code and re-encrypt remaining codes", async () => {
      const { symmetricDecrypt, symmetricEncrypt } = await import("@calcom/lib/crypto");

      const mockUser = createMockUser({
        twoFactorEnabled: true,
        backupCodes: "encrypted_backup_codes",
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);
      vi.mocked(symmetricDecrypt).mockReturnValue(JSON.stringify(["code1", "code2", "code3"]));
      vi.mocked(symmetricEncrypt).mockReturnValue("re_encrypted_codes");
      mockPrismaUpdate.mockResolvedValue({});

      await authorizeCredentials({
        email: "test@example.com",
        password: "correctpassword",
        backupCode: "code2",
      } as any);

      // Verify that symmetricEncrypt was called with codes array where code2 is null
      expect(symmetricEncrypt).toHaveBeenCalled();
      const encryptCall = vi.mocked(symmetricEncrypt).mock.calls[0];
      const encryptedData = JSON.parse(encryptCall[0] as string);
      expect(encryptedData).toEqual(["code1", null, "code3"]);

      // Verify database update was called
      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          backupCodes: "re_encrypted_codes",
        },
      });
    });
  });

  describe("Admin Security Requirements", () => {
    let isPasswordValid: any;

    beforeEach(async () => {
      const isPasswordValidModule = await import("@calcom/lib/auth/isPasswordValid");
      isPasswordValid = isPasswordValidModule.isPasswordValid;
    });

    it("should return INACTIVE_ADMIN for admin with weak password and no 2FA", async () => {
      const mockUser = createMockUser({
        role: UserPermissionRole.ADMIN,
        identityProvider: IdentityProvider.CAL,
        twoFactorEnabled: false,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);
      vi.mocked(isPasswordValid).mockReturnValue(false);

      const result = await authorizeCredentials({
        email: "test@example.com",
        password: "weakpassword",
      } as any);

      expect(isPasswordValid).toHaveBeenCalledWith("weakpassword", false, true);
      expect(result?.role).toBe("INACTIVE_ADMIN");
    });

    it("should return ADMIN for admin with strong password and 2FA enabled", async () => {
      const mockUser = createMockUser({
        role: UserPermissionRole.ADMIN,
        identityProvider: IdentityProvider.CAL,
        twoFactorEnabled: true,
        twoFactorSecret: "encrypted_secret",
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);
      vi.mocked(isPasswordValid).mockReturnValue(true);

      process.env.CALENDSO_ENCRYPTION_KEY = "test_encryption_key_32_chars!!";
      const { symmetricDecrypt } = await import("@calcom/lib/crypto");
      const { totpAuthenticatorCheck } = await import("@calcom/lib/totp");
      vi.mocked(symmetricDecrypt).mockReturnValue("decrypted_secret_32_chars_long!!");
      mockTotpAuthenticatorCheck.mockReturnValue(true);

      const result = await authorizeCredentials({
        email: "test@example.com",
        password: "StrongPassword123!",
        totpCode: "123456",
      } as any);

      expect(result?.role).toBe(UserPermissionRole.ADMIN);
      delete process.env.CALENDSO_ENCRYPTION_KEY;
    });

    it("should return ADMIN for admin with non-CAL identity provider (bypass security check)", async () => {
      const mockUser = createMockUser({
        role: UserPermissionRole.ADMIN,
        identityProvider: IdentityProvider.GOOGLE,
        twoFactorEnabled: false,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);

      const result = await authorizeCredentials({
        email: "test@example.com",
        password: "weakpassword",
      } as any);

      expect(isPasswordValid).not.toHaveBeenCalled();
      expect(result?.role).toBe(UserPermissionRole.ADMIN);
    });

    it("should return ADMIN in E2E environment (bypass security check)", async () => {
      process.env.NEXT_PUBLIC_IS_E2E = "true";

      const mockUser = createMockUser({
        role: UserPermissionRole.ADMIN,
        identityProvider: IdentityProvider.CAL,
        twoFactorEnabled: false,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);

      const result = await authorizeCredentials({
        email: "test@example.com",
        password: "weakpassword",
      } as any);

      expect(result?.role).toBe(UserPermissionRole.ADMIN);
      delete process.env.NEXT_PUBLIC_IS_E2E;
    });

    it("should return INACTIVE_ADMIN for admin with strong password but no 2FA", async () => {
      const mockUser = createMockUser({
        role: UserPermissionRole.ADMIN,
        identityProvider: IdentityProvider.CAL,
        twoFactorEnabled: false,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);
      vi.mocked(isPasswordValid).mockReturnValue(true);

      const result = await authorizeCredentials({
        email: "test@example.com",
        password: "StrongPassword123!",
      } as any);

      expect(result?.role).toBe("INACTIVE_ADMIN");
    });

    it("should return INACTIVE_ADMIN for admin with 2FA but weak password", async () => {
      const mockUser = createMockUser({
        role: UserPermissionRole.ADMIN,
        identityProvider: IdentityProvider.CAL,
        twoFactorEnabled: true,
        twoFactorSecret: "encrypted_secret",
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);
      vi.mocked(isPasswordValid).mockReturnValue(false);

      process.env.CALENDSO_ENCRYPTION_KEY = "test_encryption_key_32_chars!!";
      const { symmetricDecrypt } = await import("@calcom/lib/crypto");
      const { totpAuthenticatorCheck } = await import("@calcom/lib/totp");
      vi.mocked(symmetricDecrypt).mockReturnValue("decrypted_secret_32_chars_long!!");
      mockTotpAuthenticatorCheck.mockReturnValue(true);

      const result = await authorizeCredentials({
        email: "test@example.com",
        password: "weakpassword",
        totpCode: "123456",
      } as any);

      expect(result?.role).toBe("INACTIVE_ADMIN");
      delete process.env.CALENDSO_ENCRYPTION_KEY;
    });
  });
});
