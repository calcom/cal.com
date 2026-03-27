import { UserPermissionRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAuthorizedUsersHandler } from "./listAuthorizedUsers.handler";

const mocks = vi.hoisted(() => {
  return {
    findByClientId: vi.fn(),
    findByClientIdIncludeUser: vi.fn(),
  };
});

vi.mock("@calcom/features/oauth/di/OAuthClientRepository.container", () => ({
  getOAuthClientRepository: () => ({
    findByClientId: mocks.findByClientId,
  }),
}));

vi.mock("@calcom/features/oauth/di/OAuthAuthorizationRepository.container", () => ({
  getOAuthAuthorizationRepository: () => ({
    findByClientIdIncludeUser: mocks.findByClientIdIncludeUser,
  }),
}));

const CLIENT_ID = "client_123";
const OWNER_USER_ID = 42;

describe("listAuthorizedUsersHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns authorized users when called by the client owner", async () => {
    const authorizedUsers = [
      {
        scopes: [],
        createdAt: new Date("2026-01-15T00:00:00Z"),
        lastRefreshedAt: new Date("2026-03-01T00:00:00Z"),
        user: { id: 1, name: "Alice", email: "alice@example.com" },
      },
      {
        scopes: [],
        createdAt: new Date("2026-02-10T00:00:00Z"),
        lastRefreshedAt: null,
        user: { id: 2, name: "Bob", email: "bob@example.com" },
      },
    ];

    mocks.findByClientId.mockResolvedValue({
      clientId: CLIENT_ID,
      userId: OWNER_USER_ID,
    });
    mocks.findByClientIdIncludeUser.mockResolvedValue(authorizedUsers);

    const ctx = {
      user: {
        id: OWNER_USER_ID,
        role: UserPermissionRole.USER,
      },
    };

    const result = await listAuthorizedUsersHandler({
      ctx,
      input: { clientId: CLIENT_ID, page: 1, pageSize: 50 },
    });

    expect(result).toEqual(authorizedUsers);
    expect(mocks.findByClientId).toHaveBeenCalledWith(CLIENT_ID);
    expect(mocks.findByClientIdIncludeUser).toHaveBeenCalledWith(CLIENT_ID, 1, 50);
  });

  it("returns authorized users when called by an admin who is not the owner", async () => {
    const authorizedUsers = [
      {
        scopes: [],
        createdAt: new Date("2026-01-15T00:00:00Z"),
        lastRefreshedAt: null,
        user: { id: 3, name: "Charlie", email: "charlie@example.com" },
      },
    ];

    mocks.findByClientId.mockResolvedValue({
      clientId: CLIENT_ID,
      userId: OWNER_USER_ID,
    });
    mocks.findByClientIdIncludeUser.mockResolvedValue(authorizedUsers);

    const ctx = {
      user: {
        id: 999,
        role: UserPermissionRole.ADMIN,
      },
    };

    const result = await listAuthorizedUsersHandler({
      ctx,
      input: { clientId: CLIENT_ID, page: 1, pageSize: 50 },
    });

    expect(result).toEqual(authorizedUsers);
    expect(mocks.findByClientId).toHaveBeenCalledWith(CLIENT_ID);
    expect(mocks.findByClientIdIncludeUser).toHaveBeenCalledWith(CLIENT_ID, 1, 50);
  });

  it("throws NOT_FOUND when client does not exist", async () => {
    mocks.findByClientId.mockResolvedValue(null);

    const ctx = {
      user: {
        id: OWNER_USER_ID,
        role: UserPermissionRole.USER,
      },
    };

    await expect(
      listAuthorizedUsersHandler({
        ctx,
        input: { clientId: "nonexistent_client", page: 1, pageSize: 50 },
      })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "OAuth client not found",
    });

    expect(mocks.findByClientIdIncludeUser).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when a non-owner non-admin user requests the list", async () => {
    mocks.findByClientId.mockResolvedValue({
      clientId: CLIENT_ID,
      userId: OWNER_USER_ID,
    });

    const ctx = {
      user: {
        id: 999,
        role: UserPermissionRole.USER,
      },
    };

    await expect(
      listAuthorizedUsersHandler({
        ctx,
        input: { clientId: CLIENT_ID, page: 1, pageSize: 50 },
      })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "OAuth client not found",
    });

    expect(mocks.findByClientIdIncludeUser).not.toHaveBeenCalled();
  });

  it("returns empty array when no users have authorized", async () => {
    mocks.findByClientId.mockResolvedValue({
      clientId: CLIENT_ID,
      userId: OWNER_USER_ID,
    });
    mocks.findByClientIdIncludeUser.mockResolvedValue([]);

    const ctx = {
      user: {
        id: OWNER_USER_ID,
        role: UserPermissionRole.USER,
      },
    };

    const result = await listAuthorizedUsersHandler({
      ctx,
      input: { clientId: CLIENT_ID, page: 1, pageSize: 50 },
    });

    expect(result).toEqual([]);
  });

  it("passes pagination parameters correctly", async () => {
    mocks.findByClientId.mockResolvedValue({
      clientId: CLIENT_ID,
      userId: OWNER_USER_ID,
    });
    mocks.findByClientIdIncludeUser.mockResolvedValue([]);

    const ctx = {
      user: {
        id: OWNER_USER_ID,
        role: UserPermissionRole.USER,
      },
    };

    await listAuthorizedUsersHandler({
      ctx,
      input: { clientId: CLIENT_ID, page: 3, pageSize: 100 },
    });

    expect(mocks.findByClientIdIncludeUser).toHaveBeenCalledWith(CLIENT_ID, 3, 100);
  });
});
