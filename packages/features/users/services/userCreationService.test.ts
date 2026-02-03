import { describe, test, expect, vi, beforeEach } from "vitest";

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

const mockUserRepository = {
  create: vi.fn(),
};

vi.mock("@calcom/features/users/repositories/UserRepository", () => {
  return {
    UserRepository: vi.fn(function () {
      return mockUserRepository;
    }),
  };
});

vi.mock("@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller", () => ({
  checkIfEmailIsBlockedInWatchlistController: vi.fn().mockResolvedValue(false),
}));

const mockUserData = {
  email: "test@example.com",
  username: "test",
  creationSource: CreationSource.WEBAPP,
};

vi.stubEnv("CALCOM_LICENSE_KEY", undefined);

describe("UserCreationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should create user", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      username: "test",
      locked: false,
      organizationId: null,
    });

    mockUserRepository.create = mockCreate;

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
    });

    mockUserRepository.create = mockCreate;

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
    });

    mockUserRepository.create = mockCreate;

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
