import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "./ErrorCode";

const mockAuthorize = vi.fn();

vi.mock("../di/AuthCredentialsService.container", () => ({
  getAuthCredentialsService: () => ({
    authorize: mockAuthorize,
  }),
}));

// These mocks are needed for the module-level code in next-auth-options.ts
vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    user: { update: vi.fn(), findFirst: vi.fn() },
  };
  return {
    default: mockPrisma,
    prisma: mockPrisma,
  };
});

vi.mock("@calcom/features/users/repositories/UserRepository", () => {
  return {
    UserRepository: vi.fn().mockImplementation(() => ({
      findByEmailAndIncludeProfilesAndPassword: vi.fn(),
    })),
  };
});

vi.mock("@calcom/features/profile/lib/hideBranding", () => ({
  getHideBranding: vi.fn().mockResolvedValue(false),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
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

vi.mock("@calcom/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
  return {
    ...actual,
    WEBAPP_URL: "http://localhost:3000",
  };
});

vi.mock("@calcom/lib/env", () => ({
  isENVDev: false,
}));

describe("authorizeCredentials", () => {
  let authorizeCredentials: typeof import("./next-auth-options").authorizeCredentials;

  beforeEach(async () => {
    vi.clearAllMocks();
    const authModule = await import("./next-auth-options");
    authorizeCredentials = authModule.authorizeCredentials;
  });

  it("delegates to AuthCredentialsService.authorize", async () => {
    const mockUser = { id: 1, name: "Test" };
    mockAuthorize.mockResolvedValue(mockUser);

    const result = await authorizeCredentials({
      email: "test@example.com",
      password: "password123",
      totpCode: "",
      backupCode: "",
    });

    expect(mockAuthorize).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
      totpCode: "",
      backupCode: "",
    });
    expect(result).toEqual(mockUser);
  });

  it("propagates errors from AuthCredentialsService", async () => {
    mockAuthorize.mockRejectedValue(new Error(ErrorCode.IncorrectEmailPassword));

    await expect(
      authorizeCredentials({
        email: "test@example.com",
        password: "wrong",
        totpCode: "",
        backupCode: "",
      })
    ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
  });

  it("returns null when service returns null", async () => {
    mockAuthorize.mockResolvedValue(null);

    const result = await authorizeCredentials({
      email: "test@example.com",
      password: "password123",
      totpCode: "",
      backupCode: "",
    });

    expect(result).toBeNull();
  });

  describe("Inactive admin reason", () => {
    it("passes through inactiveAdminReason from service", async () => {
      const mockUser = { id: 1, name: "Test", role: "INACTIVE_ADMIN", inactiveAdminReason: "both" };
      mockAuthorize.mockResolvedValue(mockUser);

      const result = await authorizeCredentials({
        email: "admin@example.com",
        password: "password123",
        totpCode: "",
        backupCode: "",
      });

      expect(result?.role).toBe("INACTIVE_ADMIN");
      expect(result?.inactiveAdminReason).toBe("both");
    });

    it("passes through when admin requirements are met", async () => {
      const mockUser = { id: 1, name: "Test", role: "ADMIN" };
      mockAuthorize.mockResolvedValue(mockUser);

      const result = await authorizeCredentials({
        email: "admin@example.com",
        password: "password123",
        totpCode: "123456",
        backupCode: "",
      });

      expect(result?.role).toBe("ADMIN");
      expect(result?.inactiveAdminReason).toBeUndefined();
    });
  });
});
