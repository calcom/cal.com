import { describe, expect, it, vi, beforeEach } from "vitest";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import type { PrismaClient } from "@calcom/prisma";

import { deleteClientSecretHandler } from "./handler";

const mocks = vi.hoisted(() => {
  return {
    findByClientId: vi.fn(),
    deleteClientSecretIfNotLast: vi.fn(),
    CANNOT_DELETE_LAST_SECRET: "Cannot delete the last secret of a confidential client.",
  };
});

vi.mock("@calcom/features/oauth/repositories/OAuthClientRepository", () => ({
  CANNOT_DELETE_LAST_SECRET: mocks.CANNOT_DELETE_LAST_SECRET,
  OAuthClientRepository: class {
    constructor() {}
    findByClientId = mocks.findByClientId;
    deleteClientSecretIfNotLast = mocks.deleteClientSecretIfNotLast;
  },
}));

const ctx = { user: { id: 1 }, prisma: {} as unknown as PrismaClient };
const input = { clientId: "abc", secretId: 5 };

describe("deleteClientSecretHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NOT_FOUND when client does not exist", async () => {
    mocks.findByClientId.mockResolvedValue(null);

    await expect(deleteClientSecretHandler({ ctx, input })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws NOT_FOUND when user does not own the client", async () => {
    mocks.findByClientId.mockResolvedValue({ clientId: "abc", userId: 999, clientType: "CONFIDENTIAL" });

    await expect(deleteClientSecretHandler({ ctx, input })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws BAD_REQUEST for public clients", async () => {
    mocks.findByClientId.mockResolvedValue({ clientId: "abc", userId: 1, clientType: "PUBLIC" });

    await expect(deleteClientSecretHandler({ ctx, input })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Public clients do not use client secrets",
    });
  });

  it("throws BAD_REQUEST when trying to delete the last secret", async () => {
    mocks.findByClientId.mockResolvedValue({ clientId: "abc", userId: 1, clientType: "CONFIDENTIAL" });
    mocks.deleteClientSecretIfNotLast.mockRejectedValue(
      new ErrorWithCode(ErrorCode.BadRequest, mocks.CANNOT_DELETE_LAST_SECRET)
    );

    await expect(deleteClientSecretHandler({ ctx, input })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: mocks.CANNOT_DELETE_LAST_SECRET,
    });
  });

  it("throws NOT_FOUND when secret does not exist", async () => {
    mocks.findByClientId.mockResolvedValue({ clientId: "abc", userId: 1, clientType: "CONFIDENTIAL" });
    mocks.deleteClientSecretIfNotLast.mockRejectedValue(new Error("Record not found"));

    await expect(deleteClientSecretHandler({ ctx, input })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Secret not found or does not belong to this client.",
    });
  });

  it("deletes the secret and returns the secretId", async () => {
    mocks.findByClientId.mockResolvedValue({ clientId: "abc", userId: 1, clientType: "CONFIDENTIAL" });
    mocks.deleteClientSecretIfNotLast.mockResolvedValue({});

    const result = await deleteClientSecretHandler({ ctx, input });

    expect(result).toEqual({ secretId: 5 });
    expect(mocks.deleteClientSecretIfNotLast).toHaveBeenCalledWith(5, "abc");
  });
});
