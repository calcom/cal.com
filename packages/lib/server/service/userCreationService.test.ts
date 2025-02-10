import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, test, expect, vi, beforeEach } from "vitest";

import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";
import { CreationSource, MembershipRole } from "@calcom/prisma/enums";

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

  test("should create user with transformed fields", async () => {
    vi.spyOn(UserRepository, "create").mockResolvedValue({
      username: "test",
      locked: false,
      organizationId: null,
    } as any);

    const user = await UserCreationService.createUser({ data: mockUserData });

    expect(UserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          email: "test@example.com",
          username: "test",
          creationSource: CreationSource.WEBAPP,
          locked: false,
        },
      })
    );

    expect(user).not.toHaveProperty("locked");
  });

  test("should lock user when email is in watchlist", async () => {
    vi.mocked(checkIfEmailIsBlockedInWatchlistController).mockResolvedValue(true);

    vi.spyOn(UserRepository, "create").mockResolvedValue({
      username: "test",
      locked: true,
      organizationId: null,
    } as any);

    const user = await UserCreationService.createUser({ data: mockUserData });

    expect(UserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          locked: true,
        }),
      })
    );

    expect(user).not.toHaveProperty("locked");
  });

  test("should hash password when provided", async () => {
    const mockPassword = "password";
    vi.mocked(hashPassword).mockResolvedValue("hashed_password");

    vi.spyOn(UserRepository, "create").mockResolvedValue({
      username: "test",
      locked: true,
      organizationId: null,
    } as any);

    const user = await UserCreationService.createUser({
      data: { ...mockUserData, password: mockPassword },
    });

    expect(hashPassword).toHaveBeenCalledWith(mockPassword);
    expect(UserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hashedPassword: "hashed_password",
        }),
      })
    );

    expect(user).not.toHaveProperty("locked");
  });

  test("if orgData is passed, user should be created with orgData", async () => {
    vi.spyOn(UserRepository, "create").mockResolvedValue({
      username: "test",
      locked: true,
      organizationId: null,
    } as any);

    const user = await UserCreationService.createUser({
      data: mockUserData,
      orgData: { id: 1, role: MembershipRole.OWNER, accepted: true },
    });

    expect(UserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orgData: expect.objectContaining({
          id: 1,
          role: MembershipRole.OWNER,
          accepted: true,
        }),
      })
    );
  });
});
