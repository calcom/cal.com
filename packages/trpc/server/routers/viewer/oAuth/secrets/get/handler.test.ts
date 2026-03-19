import { describe, expect, it, vi, beforeEach } from "vitest";

import type { PrismaClient } from "@calcom/prisma";

import { getClientSecretsHandler } from "./handler";

const mocks = vi.hoisted(() => {
  return {
    findByClientId: vi.fn(),
    getClientSecrets: vi.fn(),
  };
});

vi.mock("@calcom/features/oauth/repositories/OAuthClientRepository", () => ({
  OAuthClientRepository: class {
    constructor() {}
    findByClientId = mocks.findByClientId;
    getClientSecrets = mocks.getClientSecrets;
  },
}));

const ctx = { user: { id: 1 }, prisma: {} as unknown as PrismaClient };

describe("getClientSecretsHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NOT_FOUND when client does not exist", async () => {
    mocks.findByClientId.mockResolvedValue(null);

    await expect(getClientSecretsHandler({ ctx, input: { clientId: "abc" } })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws NOT_FOUND when user does not own the client", async () => {
    mocks.findByClientId.mockResolvedValue({ clientId: "abc", userId: 999 });

    await expect(getClientSecretsHandler({ ctx, input: { clientId: "abc" } })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws NOT_FOUND when client has no userId", async () => {
    mocks.findByClientId.mockResolvedValue({ clientId: "abc", userId: null });

    await expect(getClientSecretsHandler({ ctx, input: { clientId: "abc" } })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns secrets with correct data shape", async () => {
    const secrets = [
      { id: 1, secretHint: "aa11", createdAt: new Date("2025-01-01") },
      { id: 2, secretHint: "bb22", createdAt: new Date("2025-02-01") },
    ];

    mocks.findByClientId.mockResolvedValue({ clientId: "abc", userId: 1 });
    mocks.getClientSecrets.mockResolvedValue(secrets);

    const result = await getClientSecretsHandler({ ctx, input: { clientId: "abc" } });

    expect(result).toEqual(secrets);
    expect(mocks.getClientSecrets).toHaveBeenCalledWith("abc");
  });

  it("returns empty array when no secrets exist", async () => {
    mocks.findByClientId.mockResolvedValue({ clientId: "abc", userId: 1 });
    mocks.getClientSecrets.mockResolvedValue([]);

    const result = await getClientSecretsHandler({ ctx, input: { clientId: "abc" } });

    expect(result).toEqual([]);
  });
});
