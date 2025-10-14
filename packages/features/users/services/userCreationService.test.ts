import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, test, expect, vi, beforeEach } from "vitest";

import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";
import { hashPassword } from "@calcom/lib/auth/hashPassword";
import { CreationSource } from "@calcom/prisma/enums";

import { UserCreationService } from "./userCreationService";

vi.mock("@calcom/lib/server/i18n", () => {
  return {
    getTranslation: async (locale: string, namespace: string) => {
      const t = (key: string) => key;
      t.locale = locale;
      t.namespace = namespace;
      return t;
    },
  };
});

vi.mock("@calcom/lib/auth/hashPassword", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
}));

vi.mock("@calcom/features/users/repositories/UserRepository", () => {
  return {
    UserRepository: vi.fn().mockImplementation(() => ({
      create: vi.fn(),
    })),
  };
});

vi.mock("@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller", (async) => ({
  checkIfEmailIsBlockedInWatchlistController: vi.fn(() => false),
}));

const mockUserData = {
  email: "test@example.com",
  username: "test",
  creationSource: CreationSource.WEBAPP,
};

vi.stubEnv("CALCOM_LICENSE_KEY", undefined);

describe("UserCreationService", () => {
  beforeEach(() => {
    prismock;
    vi.clearAllMocks();
  });

  test("should create user", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      username: "test",
      locked: false,
      organizationId: null,
    } as any);

    const mockUserRepository = vi.mocked(UserRepository);
    if (mockUserRepository && typeof mockUserRepository.mockImplementation === "function") {
      mockUserRepository.mockImplementation(
        () =>
          ({
            create: mockCreate,
          } as any)
      );
    }

    const user = await UserCreationService.createUser({ data: mockUserData });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "test",
        locked: false,
        organizationId: null,
      })
    );

    expect(user).not.toHaveProperty("locked");
  });

  test("should lock user when email is in watchlist", async () => {
    vi.mocked(checkIfEmailIsBlockedInWatchlistController).mockResolvedValue(true);

    const mockCreate = vi.fn().mockResolvedValue({
      username: "test",
      locked: true,
      organizationId: null,
    } as any);

    const mockUserRepository = vi.mocked(UserRepository);
    if (mockUserRepository && typeof mockUserRepository.mockImplementation === "function") {
      mockUserRepository.mockImplementation(
        () =>
          ({
            create: mockCreate,
          } as any)
      );
    }

    const user = await UserCreationService.createUser({ data: mockUserData });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        locked: true,
      })
    );

    expect(user).not.toHaveProperty("locked");
  });

  test("should hash password when provided", async () => {
    const mockPassword = "password";
    vi.mocked(hashPassword).mockResolvedValue("hashed_password");

    const mockCreate = vi.fn().mockResolvedValue({
      username: "test",
      locked: false,
      organizationId: null,
    } as any);

    const mockUserRepository = vi.mocked(UserRepository);
    if (mockUserRepository && typeof mockUserRepository.mockImplementation === "function") {
      mockUserRepository.mockImplementation(
        () =>
          ({
            create: mockCreate,
          } as any)
      );
    }

    const user = await UserCreationService.createUser({
      data: { ...mockUserData, password: mockPassword },
    });

    expect(hashPassword).toHaveBeenCalledWith(mockPassword);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        hashedPassword: "hashed_password",
      })
    );

    expect(user).not.toHaveProperty("locked");
  });
});
