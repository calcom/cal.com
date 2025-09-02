import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, test, expect, vi, beforeEach } from "vitest";

import { hashPasswordWithSalt } from "@calcom/features/auth/lib/hashPassword";
import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";
import { CreationSource } from "@calcom/prisma/enums";

import { UserRepository } from "../repository/user";
import { UserCreationService } from "./userCreationService";

vi.mock("@calcom/lib/server/i18n", () => {
  return {
    getTranslation: (key: string) => {
      return () => key;
    },
  };
});

vi.mock("@calcom/features/auth/lib/hashPassword", () => ({
  hashPasswordWithSalt: vi.fn().mockResolvedValue({ hash: "hashed-password", salt: "salt" }),
}));

vi.mock("../repository/user", () => {
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
    vi.mocked(hashPasswordWithSalt).mockResolvedValue({ hash: "hashed_password", salt: "salt" });

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

    expect(hashPasswordWithSalt).toHaveBeenCalledWith(mockPassword);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        hashedPassword: "hashed_password",
        salt: "salt",
      })
    );

    expect(user).not.toHaveProperty("locked");
  });
});
