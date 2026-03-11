import { describe, it, expect, vi, beforeEach } from "vitest";

import { PrismaMembershipRepository } from "@calcom/features/membership/repositories/PrismaMembershipRepository";

import { TRPCError } from "@trpc/server";

import { deleteCredentialHandler } from "./deleteCredential.handler";

vi.mock("@calcom/features/credentials/handleDeleteCredential", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/features/membership/repositories/PrismaMembershipRepository", () => ({
  PrismaMembershipRepository: {
    getAdminOrOwnerMembership: vi.fn(),
  },
}));

const makeCtx = (userId = 1) =>
  ({
    user: { id: userId, metadata: {} },
  }) as Parameters<typeof deleteCredentialHandler>[0]["ctx"];

describe("deleteCredentialHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects team credential deletion when user has no admin/owner membership", async () => {
    vi.mocked(PrismaMembershipRepository.getAdminOrOwnerMembership).mockResolvedValue(null);

    await expect(
      deleteCredentialHandler({ ctx: makeCtx(), input: { id: 10, teamId: 99 } })
    ).rejects.toThrow(TRPCError);

    expect(PrismaMembershipRepository.getAdminOrOwnerMembership).toHaveBeenCalledWith(1, 99);
  });

  it("allows team credential deletion for admin/owner", async () => {
    vi.mocked(PrismaMembershipRepository.getAdminOrOwnerMembership).mockResolvedValue({ id: 1 });
    const handleDeleteCredential = (await import("@calcom/features/credentials/handleDeleteCredential"))
      .default;

    await deleteCredentialHandler({ ctx: makeCtx(), input: { id: 10, teamId: 99 } });

    expect(handleDeleteCredential).toHaveBeenCalledWith({
      userId: 1,
      userMetadata: {},
      credentialId: 10,
      teamId: 99,
    });
  });

  it("skips membership check when no teamId is provided", async () => {
    const handleDeleteCredential = (await import("@calcom/features/credentials/handleDeleteCredential"))
      .default;

    await deleteCredentialHandler({ ctx: makeCtx(), input: { id: 10 } });

    expect(PrismaMembershipRepository.getAdminOrOwnerMembership).not.toHaveBeenCalled();
    expect(handleDeleteCredential).toHaveBeenCalledWith({
      userId: 1,
      userMetadata: {},
      credentialId: 10,
      teamId: undefined,
    });
  });
});
