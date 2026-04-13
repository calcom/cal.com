import { DelegationCredentialRepository } from "@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository";
import { WorkspacePlatformRepository } from "@calcom/features/workspace-platform/repositories/WorkspacePlatformRepository";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import handler from "./add.handler";

vi.mock("@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository", () => ({
  DelegationCredentialRepository: {
    findAllByDomain: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@calcom/features/workspace-platform/repositories/WorkspacePlatformRepository", () => ({
  WorkspacePlatformRepository: {
    findBySlug: vi.fn(),
  },
}));

function buildServiceAccountKey(overrides?: Partial<{ client_id: string; client_email: string; private_key: string }>) {
  return {
    client_id: "123456",
    client_email: "test@project.iam.gserviceaccount.com",
    private_key: "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
    ...overrides,
  };
}

function buildWorkspacePlatform(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    name: "Google",
    slug: "google",
    enabled: true,
    description: "Google Workspace",
    ...overrides,
  };
}

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

function buildInput(overrides?: Record<string, unknown>) {
  return {
    workspacePlatformSlug: "google",
    domain: "example.com",
    serviceAccountKey: buildServiceAccountKey(),
    ...overrides,
  };
}

function buildCtx(overrides: { organizationId: number | null } = { organizationId: 1 }) {
  return { user: { id: 1, organizationId: overrides.organizationId } };
}

describe("add delegation credential", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when user is not part of an organization", async () => {
    await expect(
      handler({ input: buildInput(), ctx: buildCtx({ organizationId: null }) })
    ).rejects.toThrow("You must be part of an organization to add a delegation credential");
  });

  it("rejects when the workspace platform does not exist", async () => {
    vi.mocked(WorkspacePlatformRepository.findBySlug).mockResolvedValue(null);
    vi.mocked(DelegationCredentialRepository.findAllByDomain).mockResolvedValue([]);

    await expect(
      handler({ input: buildInput({ workspacePlatformSlug: "unknown-platform" }), ctx: buildCtx() })
    ).rejects.toThrow("Workspace platform unknown-platform not found");
  });

  it("prevents creating a credential for a domain already configured in the same org", async () => {
    vi.mocked(DelegationCredentialRepository.findAllByDomain).mockResolvedValue([
      buildDelegationCredential(),
    ]);
    vi.mocked(WorkspacePlatformRepository.findBySlug).mockResolvedValue(buildWorkspacePlatform());

    await expect(
      handler({ input: buildInput(), ctx: buildCtx() })
    ).rejects.toThrow("Your organization already has delegation credential for example.com");
  });

  it("prevents creating a credential for a domain already enabled in another org", async () => {
    vi.mocked(DelegationCredentialRepository.findAllByDomain).mockResolvedValue([
      buildDelegationCredential({ organizationId: 2 }),
    ]);
    vi.mocked(WorkspacePlatformRepository.findBySlug).mockResolvedValue(buildWorkspacePlatform());

    await expect(
      handler({ input: buildInput(), ctx: buildCtx() })
    ).rejects.toThrow("Domain example.com already has delegation credential enabled in another organization");
  });

  it("creates the credential as disabled by default", async () => {
    vi.mocked(DelegationCredentialRepository.findAllByDomain).mockResolvedValue([]);
    vi.mocked(WorkspacePlatformRepository.findBySlug).mockResolvedValue(buildWorkspacePlatform());
    vi.mocked(DelegationCredentialRepository.create).mockResolvedValue(
      buildDelegationCredential({ id: "new-id", enabled: false })
    );

    await handler({ input: buildInput(), ctx: buildCtx() });

    expect(DelegationCredentialRepository.create).toHaveBeenCalledWith({
      workspacePlatformId: 1,
      domain: "example.com",
      enabled: false,
      organizationId: 1,
      serviceAccountKey: buildServiceAccountKey(),
    });
  });

  it("does not expose the service account key in the response", async () => {
    vi.mocked(DelegationCredentialRepository.findAllByDomain).mockResolvedValue([]);
    vi.mocked(WorkspacePlatformRepository.findBySlug).mockResolvedValue(buildWorkspacePlatform());
    vi.mocked(DelegationCredentialRepository.create).mockResolvedValue(
      buildDelegationCredential({ id: "new-id", enabled: false, serviceAccountKey: buildServiceAccountKey() })
    );

    const result = await handler({ input: buildInput(), ctx: buildCtx() });

    expect(result).toBeDefined();
    expect(result!.serviceAccountKey).toBeUndefined();
    expect(result!.id).toBe("new-id");
    expect(result!.domain).toBe("example.com");
  });

  it("wraps unexpected repository errors as INTERNAL_SERVER_ERROR via the catch block", async () => {
    vi.mocked(DelegationCredentialRepository.findAllByDomain).mockResolvedValue([]);
    vi.mocked(WorkspacePlatformRepository.findBySlug).mockResolvedValue(buildWorkspacePlatform());
    vi.mocked(DelegationCredentialRepository.create).mockRejectedValue(
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
