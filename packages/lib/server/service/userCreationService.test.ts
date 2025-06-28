import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, test, expect, vi, beforeEach } from "vitest";

import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
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
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
}));

vi.mock("../repository/user", async () => {
  return {
    UserRepository: {
      create: vi.fn(),
    },
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
    vi.spyOn(UserRepository, "create").mockResolvedValue({
      username: "test",
      locked: false,
      organizationId: null,
    } as any);

    const user = await UserCreationService.createUser({ data: mockUserData });

    expect(UserRepository.create).toHaveBeenCalledWith(
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

    const user = await UserCreationService.createUser({ data: mockUserData });

    expect(UserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        locked: true,
      })
    );

    expect(user).not.toHaveProperty("locked");
  });

  test("should hash password when provided", async () => {
    const mockPassword = "password";
    vi.mocked(hashPassword).mockResolvedValue("hashed_password");

    const user = await UserCreationService.createUser({
      data: { ...mockUserData, password: mockPassword },
    });

    expect(hashPassword).toHaveBeenCalledWith(mockPassword);
    expect(UserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        hashedPassword: "hashed_password",
      })
    );

    expect(user).not.toHaveProperty("locked");
  });
});
