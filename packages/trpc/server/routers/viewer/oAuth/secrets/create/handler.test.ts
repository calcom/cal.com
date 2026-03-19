import { describe, expect, it, vi, beforeEach } from "vitest";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import type { PrismaClient } from "@calcom/prisma";

import { createClientSecretHandler } from "./handler";

const mocks = vi.hoisted(() => {
  return {
    findByClientId: vi.fn(),
    createClientSecretIfUnderLimit: vi.fn(),
    generateSecret: vi.fn(),
    getSecretHint: vi.fn(),
  };
});

vi.mock("@calcom/features/oauth/repositories/OAuthClientRepository", () => ({
  OAuthClientRepository: class {
    constructor() {}
    findByClientId = mocks.findByClientId;
    createClientSecretIfUnderLimit = mocks.createClientSecretIfUnderLimit;
  },
}));

vi.mock("@calcom/features/oauth/utils/generateSecret", () => ({
  generateSecret: mocks.generateSecret,
  getSecretHint: mocks.getSecretHint,
}));

const ctx = { user: { id: 1 }, prisma: {} as unknown as PrismaClient };

describe("createClientSecretHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateSecret.mockReturnValue(["hashed-secret", "plain-secret"]);
    mocks.getSecretHint.mockReturnValue("cret");
  });

  it("throws NOT_FOUND when client does not exist", async () => {
    mocks.findByClientId.mockResolvedValue(null);

    await expect(createClientSecretHandler({ ctx, input: { clientId: "abc" } })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws NOT_FOUND when user does not own the client", async () => {
    mocks.findByClientId.mockResolvedValue({ clientId: "abc", userId: 999, clientType: "CONFIDENTIAL" });

    await expect(createClientSecretHandler({ ctx, input: { clientId: "abc" } })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws NOT_FOUND when client has no userId", async () => {
    mocks.findByClientId.mockResolvedValue({ clientId: "abc", userId: null, clientType: "CONFIDENTIAL" });

    await expect(createClientSecretHandler({ ctx, input: { clientId: "abc" } })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws BAD_REQUEST for public clients", async () => {
    mocks.findByClientId.mockResolvedValue({ clientId: "abc", userId: 1, clientType: "PUBLIC" });

    await expect(createClientSecretHandler({ ctx, input: { clientId: "abc" } })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Public clients do not use client secrets",
    });
  });

  it("throws BAD_REQUEST when max secrets reached", async () => {
    mocks.findByClientId.mockResolvedValue({ clientId: "abc", userId: 1, clientType: "CONFIDENTIAL" });
    mocks.createClientSecretIfUnderLimit.mockRejectedValue(
      new ErrorWithCode(ErrorCode.BadRequest, "Maximum of 2 secrets allowed.")
    );

    await expect(createClientSecretHandler({ ctx, input: { clientId: "abc" } })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Maximum of 2 secrets allowed. Delete an existing secret first.",
    });
  });

  it("throws INTERNAL_SERVER_ERROR for unexpected database errors", async () => {
    mocks.findByClientId.mockResolvedValue({ clientId: "abc", userId: 1, clientType: "CONFIDENTIAL" });
    mocks.createClientSecretIfUnderLimit.mockRejectedValue(new Error("Connection refused"));

    await expect(createClientSecretHandler({ ctx, input: { clientId: "abc" } })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create client secret",
    });
  });

  it("creates a secret and returns the plain secret", async () => {
    mocks.findByClientId.mockResolvedValue({ clientId: "abc", userId: 1, clientType: "CONFIDENTIAL" });
    mocks.createClientSecretIfUnderLimit.mockResolvedValue({
      id: 10,
      secretHint: "cret",
      createdAt: new Date("2025-01-01"),
    });

    const result = await createClientSecretHandler({ ctx, input: { clientId: "abc" } });

    expect(result).toEqual({
      id: 10,
      clientSecret: "plain-secret",
      secretHint: "cret",
      createdAt: new Date("2025-01-01"),
    });

    expect(mocks.createClientSecretIfUnderLimit).toHaveBeenCalledWith(
      { clientId: "abc", hashedSecret: "hashed-secret", secretHint: "cret" },
      2
    );
  });
});
