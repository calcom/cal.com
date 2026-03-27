import { UserPermissionRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { countAuthorizedUsersHandler } from "./countAuthorizedUsers.handler";

const mocks = vi.hoisted(() => {
  return {
    findByClientId: vi.fn(),
    countByClientId: vi.fn(),
  };
});

vi.mock("@calcom/features/oauth/di/OAuthClientRepository.container", () => ({
  getOAuthClientRepository: () => ({
    findByClientId: mocks.findByClientId,
  }),
}));

vi.mock("@calcom/features/oauth/di/OAuthAuthorizationRepository.container", () => ({
  getOAuthAuthorizationRepository: () => ({
    countByClientId: mocks.countByClientId,
  }),
}));

const CLIENT_ID = "client_123";
const OWNER_USER_ID = 42;

describe("countAuthorizedUsersHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns count when called by the client owner", async () => {
    mocks.findByClientId.mockResolvedValue({
      clientId: CLIENT_ID,
      userId: OWNER_USER_ID,
    });
    mocks.countByClientId.mockResolvedValue(5);

    const ctx = {
      user: {
        id: OWNER_USER_ID,
        role: UserPermissionRole.USER,
      },
    };

    const result = await countAuthorizedUsersHandler({
      ctx,
      input: { clientId: CLIENT_ID },
    });

    expect(result).toBe(5);
    expect(mocks.findByClientId).toHaveBeenCalledWith(CLIENT_ID);
    expect(mocks.countByClientId).toHaveBeenCalledWith(CLIENT_ID);
  });

  it("returns count when called by an admin who is not the owner", async () => {
    mocks.findByClientId.mockResolvedValue({
      clientId: CLIENT_ID,
      userId: OWNER_USER_ID,
    });
    mocks.countByClientId.mockResolvedValue(10);

    const ctx = {
      user: {
        id: 999,
        role: UserPermissionRole.ADMIN,
      },
    };

    const result = await countAuthorizedUsersHandler({
      ctx,
      input: { clientId: CLIENT_ID },
    });

    expect(result).toBe(10);
    expect(mocks.findByClientId).toHaveBeenCalledWith(CLIENT_ID);
    expect(mocks.countByClientId).toHaveBeenCalledWith(CLIENT_ID);
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
      countAuthorizedUsersHandler({
        ctx,
        input: { clientId: "nonexistent_client" },
      })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "OAuth client not found",
    });

    expect(mocks.countByClientId).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when a non-owner non-admin user requests count", async () => {
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
      countAuthorizedUsersHandler({
        ctx,
        input: { clientId: CLIENT_ID },
      })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "OAuth client not found",
    });

    expect(mocks.countByClientId).not.toHaveBeenCalled();
  });

  it("returns zero when no users have authorized", async () => {
    mocks.findByClientId.mockResolvedValue({
      clientId: CLIENT_ID,
      userId: OWNER_USER_ID,
    });
    mocks.countByClientId.mockResolvedValue(0);

    const ctx = {
      user: {
        id: OWNER_USER_ID,
        role: UserPermissionRole.USER,
      },
    };

    const result = await countAuthorizedUsersHandler({
      ctx,
      input: { clientId: CLIENT_ID },
    });

    expect(result).toBe(0);
  });
});
