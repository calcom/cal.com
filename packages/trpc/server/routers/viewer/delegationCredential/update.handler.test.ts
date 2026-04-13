import { DelegationCredentialRepository } from "@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository";
import { WorkspacePlatformRepository } from "@calcom/features/workspace-platform/repositories/WorkspacePlatformRepository";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import handler from "./update.handler";

vi.mock("@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository", () => ({
  DelegationCredentialRepository: {
    findAllByDomain: vi.fn(),
    updateById: vi.fn(),
  },
}));

vi.mock("@calcom/features/workspace-platform/repositories/WorkspacePlatformRepository", () => ({
  WorkspacePlatformRepository: {
    findBySlugIncludeSensitiveServiceAccountKey: vi.fn(),
  },
}));

function buildDelegationCredential(overrides?: Record<string, unknown>) {
  return {
    id: "cred-1",
    domain: "example.com",
    organizationId: 1,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastEnabledAt: null,
    lastDisabledAt: null,
    workspacePlatform: { name: "Google", slug: "google" },
    ...overrides,
  };
}

function buildWorkspacePlatformWithKey(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    name: "Google",
    slug: "google",
    enabled: true,
    description: "Google Workspace",
    defaultServiceAccountKey: {
      client_id: "123",
      client_email: "sa@project.iam.gserviceaccount.com",
      private_key: "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
    },
    ...overrides,
  };
}

function buildInput(overrides?: Record<string, unknown>) {
  return {
    id: "cred-1",
    workspacePlatformSlug: "google",
    domain: "example.com",
    ...overrides,
  };
}

function buildCtx(overrides: { organizationId: number | null } = { organizationId: 1 }) {
  return { user: { id: 1, organizationId: overrides.organizationId } };
}

describe("update delegation credential", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when user is not part of an organization", async () => {
    await expect(
      handler({ input: buildInput(), ctx: buildCtx({ organizationId: null }) })
    ).rejects.toThrow("You must be part of an organization to update a delegation credential");
  });

  it("rejects when the workspace platform does not exist", async () => {
    vi.mocked(DelegationCredentialRepository.findAllByDomain).mockResolvedValue([]);
    vi.mocked(WorkspacePlatformRepository.findBySlugIncludeSensitiveServiceAccountKey).mockResolvedValue(null);

    await expect(
      handler({ input: buildInput({ workspacePlatformSlug: "unknown-platform" }), ctx: buildCtx() })
    ).rejects.toThrow("Workspace platform unknown-platform not found");
  });

  it("prevents updating to a domain already configured in the same org by another credential", async () => {
    vi.mocked(DelegationCredentialRepository.findAllByDomain).mockResolvedValue([
      buildDelegationCredential({ id: "other-cred-id" }),
    ]);

    await expect(
      handler({ input: buildInput(), ctx: buildCtx() })
    ).rejects.toThrow("Your organization already has delegation credential for example.com");
  });

  it("prevents updating to a domain already enabled in a different org", async () => {
    vi.mocked(DelegationCredentialRepository.findAllByDomain).mockResolvedValue([
      buildDelegationCredential({ id: "other-org-cred", organizationId: 2 }),
    ]);

    await expect(
      handler({ input: buildInput(), ctx: buildCtx() })
    ).rejects.toThrow("Domain example.com already has delegation credential enabled in another organization");
  });

  it("allows updating the credential's own domain without conflict", async () => {
    vi.mocked(DelegationCredentialRepository.findAllByDomain).mockResolvedValue([
      buildDelegationCredential({ id: "cred-1" }),
    ]);
    vi.mocked(WorkspacePlatformRepository.findBySlugIncludeSensitiveServiceAccountKey).mockResolvedValue(
      buildWorkspacePlatformWithKey()
    );
    vi.mocked(DelegationCredentialRepository.updateById).mockResolvedValue(
      buildDelegationCredential()
    );

    const result = await handler({ input: buildInput(), ctx: buildCtx() });

    expect(DelegationCredentialRepository.updateById).toHaveBeenCalledWith({
      id: "cred-1",
      data: {
        workspacePlatformId: 1,
        domain: "example.com",
        organizationId: 1,
      },
    });
    expect(result).toBeDefined();
  });

  it("does not expose the service account key in the response", async () => {
    vi.mocked(DelegationCredentialRepository.findAllByDomain).mockResolvedValue([]);
    vi.mocked(WorkspacePlatformRepository.findBySlugIncludeSensitiveServiceAccountKey).mockResolvedValue(
      buildWorkspacePlatformWithKey()
    );
    vi.mocked(DelegationCredentialRepository.updateById).mockResolvedValue(
      buildDelegationCredential({
        domain: "newdomain.com",
        serviceAccountKey: {
          client_id: "123",
          private_key: "secret",
          client_email: "sa@test.iam.gserviceaccount.com",
        },
      })
    );

    const result = await handler({
      input: buildInput({ domain: "newdomain.com" }),
      ctx: buildCtx(),
    });

    expect(result).toBeDefined();
    expect(result!.serviceAccountKey).toBeUndefined();
    expect(result!.id).toBe("cred-1");
  });

  it("wraps unexpected repository errors as INTERNAL_SERVER_ERROR via the catch block", async () => {
    vi.mocked(DelegationCredentialRepository.findAllByDomain).mockResolvedValue([]);
    vi.mocked(WorkspacePlatformRepository.findBySlugIncludeSensitiveServiceAccountKey).mockResolvedValue(
      buildWorkspacePlatformWithKey()
    );
    vi.mocked(DelegationCredentialRepository.updateById).mockRejectedValue(
      new Error("DB connection lost")
    );

    try {
      await handler({ input: buildInput(), ctx: buildCtx() });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
    }
  });
});
