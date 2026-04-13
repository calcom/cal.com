import { DelegationCredentialRepository } from "@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";

import handler from "./list.handler";

vi.mock("@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository", () => ({
  DelegationCredentialRepository: {
    findByOrgIdIncludeSensitiveServiceAccountKey: vi.fn(),
  },
}));

function buildDelegationCredentialFromRepo(overrides?: Record<string, unknown>) {
  return {
    id: "cred-1",
    domain: "example.com",
    organizationId: 1,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastEnabledAt: null,
    lastDisabledAt: null,
    serviceAccountKey: { client_id: "sa-client-123", encrypted_credentials: "enc" },
    workspacePlatform: { id: 1, name: "Google", slug: "google" },
    ...overrides,
  };
}

function buildCtx(overrides: { organizationId: number | null } = { organizationId: 1 }) {
  return {
    user: {
      id: 1,
      organization: { id: overrides.organizationId },
    },
  } as Parameters<typeof handler>[0]["ctx"];
}

describe("list delegation credentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when user is not part of an organization", async () => {
    await expect(
      handler({ ctx: buildCtx({ organizationId: null }) })
    ).rejects.toThrow("You must be in an organization to list delegation credentials");
  });

  it("returns credentials with extracted service account client ID", async () => {
    vi.mocked(DelegationCredentialRepository.findByOrgIdIncludeSensitiveServiceAccountKey).mockResolvedValue([
      buildDelegationCredentialFromRepo(),
    ]);

    const result = await handler({ ctx: buildCtx() });

    expect(result).toHaveLength(1);
    expect(result[0].serviceAccountClientId).toBe("sa-client-123");
  });

  it("returns null client ID when the service account key is malformed", async () => {
    vi.mocked(DelegationCredentialRepository.findByOrgIdIncludeSensitiveServiceAccountKey).mockResolvedValue([
      buildDelegationCredentialFromRepo({ serviceAccountKey: "malformed-string" }),
    ]);

    const result = await handler({ ctx: buildCtx() });

    expect(result).toHaveLength(1);
    expect(result[0].serviceAccountClientId).toBeNull();
  });

  it("does not expose the service account key in the response", async () => {
    vi.mocked(DelegationCredentialRepository.findByOrgIdIncludeSensitiveServiceAccountKey).mockResolvedValue([
      buildDelegationCredentialFromRepo(),
    ]);

    const result = await handler({ ctx: buildCtx() });

    expect(result[0].serviceAccountKey).toBeUndefined();
  });

  it("handles a mix of valid and malformed service account keys in the same list", async () => {
    vi.mocked(DelegationCredentialRepository.findByOrgIdIncludeSensitiveServiceAccountKey).mockResolvedValue([
      buildDelegationCredentialFromRepo({ id: "cred-valid", serviceAccountKey: { client_id: "id-1", encrypted_credentials: "enc" } }),
      buildDelegationCredentialFromRepo({ id: "cred-malformed", serviceAccountKey: "not-an-object" }),
      buildDelegationCredentialFromRepo({ id: "cred-null", serviceAccountKey: null }),
    ]);

    const result = await handler({ ctx: buildCtx() });

    expect(result).toHaveLength(3);
    expect(result[0].serviceAccountClientId).toBe("id-1");
    expect(result[1].serviceAccountClientId).toBeNull();
    expect(result[2].serviceAccountClientId).toBeNull();
    // All keys stripped
    expect(result.every((r) => r.serviceAccountKey === undefined)).toBe(true);
  });

  it("returns an empty list when no credentials exist", async () => {
    vi.mocked(DelegationCredentialRepository.findByOrgIdIncludeSensitiveServiceAccountKey).mockResolvedValue(
      []
    );

    const result = await handler({ ctx: buildCtx() });

    expect(result).toEqual([]);
  });
});
