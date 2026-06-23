import prismock from "@calcom/testing/lib/__mocks__/prisma";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { CreationSource } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, test, vi } from "vitest";
vi.mock("@calcom/app-store/delegationCredential", () => ({
  enrichHostsWithDelegationCredentials: vi.fn(),
  getUsersCredentialsIncludeServiceAccountKey: vi.fn(),
  getCredentialForSelectedCalendar: vi.fn(),
}));

vi.mock("@calcom/i18n/server", () => {
  return {
    getTranslation: async (locale: string, namespace: string) => {
      const t = (key: string) => key;
      t.locale = locale;
      t.namespace = namespace;
      return t;
    },
  };
});

describe("UserRepository", () => {
  beforeEach(() => {
    prismock;
  });

  describe("create", () => {
    test("Should create a user without a password", async () => {
      const user = await new UserRepository(prismock).create({
        username: "test",
        email: "test@example.com",
        organizationId: null,
        creationSource: CreationSource.WEBAPP,
        locked: false,
      });

      expect(user).toEqual(
        expect.objectContaining({
          username: "test",
          email: "test@example.com",
          organizationId: null,
          creationSource: CreationSource.WEBAPP,
          locked: false,
        })
      );

      const password = await prismock.userPassword.findUnique({
        where: {
          userId: user.id,
        },
      });

      expect(password).toBeNull();
    });

    test("If locked param is passed, user should be locked", async () => {
      const user = await new UserRepository(prismock).create({
        username: "test",
        email: "test@example.com",
        organizationId: null,
        creationSource: CreationSource.WEBAPP,
        locked: true,
      });

      const userQuery = await prismock.user.findUnique({
        where: {
          email: "test@example.com",
        },
        select: {
          locked: true,
        },
      });

      expect(userQuery).toEqual(
        expect.objectContaining({
          locked: true,
        })
      );
    });

    test("If organizationId is passed, user should be associated with the organization", async () => {
      const organizationId = 123;
      const username = "test";

      const user = await new UserRepository(prismock).create({
        username,
        email: "test@example.com",
        organizationId,
        creationSource: CreationSource.WEBAPP,
        locked: true,
      });

      expect(user).toEqual(
        expect.objectContaining({
          organizationId,
        })
      );

      const profile = await prismock.profile.findFirst({
        where: {
          organizationId,
          username,
        },
      });

      expect(profile).toEqual(
        expect.objectContaining({
          organizationId,
          username,
        })
      );
    });
  });
});
describe("listUsers", () => {
  test("Should return all users matching search term with default pagination", async () => {
    await new UserRepository(prismock).create({
      username: "alice",
      email: "alice@example.com",
      organizationId: null,
      creationSource: CreationSource.WEBAPP,
      locked: false,
    });
    await new UserRepository(prismock).create({
      username: "bob",
      email: "bob@example.com",
      organizationId: null,
      creationSource: CreationSource.WEBAPP,
      locked: false,
    });
    const { users, total } = await new UserRepository(prismock).listUsers({
      searchTerm: null,
      cursor: null,
      limit: 10,
    });

    expect(users).toHaveLength(2);
    expect(total).toEqual(2);
  });
  test("Should filter users by searchTerm matching username (case-insensitive)", async () => {
    await new UserRepository(prismock).create({
      username: "alice",
      email: "alice@example.com",
      organizationId: null,
      creationSource: CreationSource.WEBAPP,
      locked: false,
    });
    await new UserRepository(prismock).create({
      username: "bob",
      email: "bob@example.com",
      organizationId: null,
      creationSource: CreationSource.WEBAPP,
      locked: false,
    });

    const { users, total } = await new UserRepository(prismock).listUsers({
      searchTerm: "BOB",
      cursor: null,
      limit: 10,
    });

    expect(users).toHaveLength(1);
    expect(users[0]).toEqual(
      expect.objectContaining({
        username: "bob",
      })
    );
    const result = await new UserRepository(prismock).listUsers({
      searchTerm: "ALiCE",
      cursor: null,
      limit: 10,
    });

    expect(result.users).toHaveLength(1);
    expect(result.users[0]).toEqual(
      expect.objectContaining({
        username: "alice",
      })
    );
  });

  test("Should include both locked and unlocked users", async () => {
    await new UserRepository(prismock).create({
      username: "locked-user",
      email: "locked@example.com",
      organizationId: null,
      creationSource: CreationSource.WEBAPP,
      locked: true,
    });
    await new UserRepository(prismock).create({
      username: "unlocked-user",
      email: "unlocked@example.com",
      organizationId: null,
      creationSource: CreationSource.WEBAPP,
      locked: false,
    });

    const { users, total } = await new UserRepository(prismock).listUsers({
      searchTerm: null,
      cursor: null,
      limit: 10,
    });

    expect(total).toEqual(2);
    expect(users.map((u) => u.locked).sort()).toEqual([false, true]);
  });

  test("Should respect limit by returning limit + 1 rows for cursor calculation", async () => {
    for (let i = 0; i < 5; i++) {
      await new UserRepository(prismock).create({
        username: `user${i}`,
        email: `user${i}@example.com`,
        organizationId: null,
        creationSource: CreationSource.WEBAPP,
        locked: false,
      });
    }

    const { users, total } = await new UserRepository(prismock).listUsers({
      searchTerm: null,
      cursor: null,
      limit: 3,
    });
    // take = limit + 1, so up to 4 rows come back to let the caller detect "has more"
    expect(users.length).toBeLessThanOrEqual(4);
    expect(total).toEqual(5);
  });

  test("Should return all users when limit is not passed (no cap)", async () => {
    for (let i = 0; i < 5; i++) {
      await new UserRepository(prismock).create({
        username: `nolimituser${i}`,
        email: `nolimituser${i}@example.com`,
        organizationId: null,
        creationSource: CreationSource.WEBAPP,
        locked: false,
      });
    }

    const { users, total } = await new UserRepository(prismock).listUsers({
      searchTerm: null,
      cursor: null,
      limit: undefined,
    });

    expect(users).toHaveLength(5);
    expect(total).toEqual(5);
  });

  test("Should return empty array when no users match searchTerm", async () => {
    await new UserRepository(prismock).create({
      username: "alice",
      email: "alice@example.com",
      organizationId: null,
      creationSource: CreationSource.WEBAPP,
      locked: false,
    });

    const { users, total } = await new UserRepository(prismock).listUsers({

      searchTerm: "nonexistent-term-xyz",
      cursor: null,
      limit: 10,
    });

    expect(users).toEqual([]);
    expect(total).toEqual(0);
  });
});