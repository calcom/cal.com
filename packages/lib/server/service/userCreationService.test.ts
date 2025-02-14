import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, test, expect, vi, beforeEach } from "vitest";

import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";
import { CreationSource, MembershipRole, IdentityProvider } from "@calcom/prisma/enums";

import { UserRepository } from "../repository/user";
import { OrganizationUserService } from "./organizationUserService";
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

vi.mock("@calcom/lib/random", () => ({
  randomString: vi.fn(() => "random-string"),
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
    vi.setSystemTime(new Date());
  });

  describe("createUser", () => {
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

      await UserCreationService.createUser({
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

  describe("createUserWithIdP", () => {
    test("should create a user not associated with an organization", async () => {
      vi.spyOn(OrganizationUserService, "checkIfUserShouldBelongToOrg").mockResolvedValue({
        orgUsername: "test",
        orgId: undefined,
      });

      vi.spyOn(UserRepository, "create").mockResolvedValue({
        username: "test",
        locked: true,
        organizationId: null,
      } as any);

      await UserCreationService.createUserWithIdP({
        idP: IdentityProvider.GOOGLE,
        email: "test@gmail.com",
        name: "Test User",
        image: "test.jpg",
        account: { providerAccountId: "123" },
      });

      expect(UserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            username: "test-user-random-string",
            email: "test@gmail.com",
            name: "Test User",
            avatarUrl: "test.jpg",
            emailVerified: new Date(Date.now()),
            identityProvider: IdentityProvider.GOOGLE,
            identityProviderId: "123",
            creationSource: CreationSource.GOOGLE,
          }),
        })
      );
    });

    test("should create a user associated with an organization", async () => {
      vi.spyOn(OrganizationUserService, "checkIfUserShouldBelongToOrg").mockResolvedValue({
        orgUsername: "test",
        orgId: 1,
      });

      vi.spyOn(UserRepository, "create").mockResolvedValue({
        username: "test",
        locked: true,
        organizationId: 1,
      } as any);

      await UserCreationService.createUserWithIdP({
        idP: IdentityProvider.GOOGLE,
        email: "test@gmail.com",
        name: "Test User",
        image: "test.jpg",
        account: { providerAccountId: "123" },
      });

      expect(UserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            username: "test",
            email: "test@gmail.com",
            name: "Test User",
            avatarUrl: "test.jpg",
            emailVerified: new Date(Date.now()),
            identityProvider: IdentityProvider.GOOGLE,
            identityProviderId: "123",
            creationSource: CreationSource.GOOGLE,
          }),
          orgData: expect.objectContaining({
            id: 1,
            role: MembershipRole.MEMBER,
            accepted: true,
          }),
        })
      );
    });
  });
});
