import { DelegationCredentialRepository } from "@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAffectedMembersForDisable } from "./getAffectedMembersForDisable.handler";

vi.mock("@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository", () => ({
  DelegationCredentialRepository: {
    findById: vi.fn(),
  },
}));

const mockFindMembershipsCreatedAfterTimeIncludeUser = vi.fn();

vi.mock("@calcom/features/di/containers/MembershipRepository", () => ({
  getMembershipRepository: () => ({
    findMembershipsCreatedAfterTimeIncludeUser: mockFindMembershipsCreatedAfterTimeIncludeUser,
  }),
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

function buildMembership(overrides?: { id?: number; email?: string; name?: string }) {
  return {
    user: {
      id: overrides?.id ?? 10,
      email: overrides?.email ?? "user@example.com",
      name: overrides?.name ?? "Test User",
    },
  };
}

describe("get affected members for disabling a delegation credential", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty list when the credential does not exist", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(null);

    const result = await getAffectedMembersForDisable({ delegationCredentialId: "nonexistent" });

    expect(result).toEqual([]);
  });

  it("returns an empty list when the credential was never enabled", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(
      buildDelegationCredential({ lastEnabledAt: null })
    );

    const result = await getAffectedMembersForDisable({ delegationCredentialId: "cred-1" });

    expect(result).toEqual([]);
    expect(mockFindMembershipsCreatedAfterTimeIncludeUser).not.toHaveBeenCalled();
  });

  it("returns members who joined after the credential was last enabled", async () => {
    const lastEnabledAt = new Date("2025-01-01");

    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(
      buildDelegationCredential({ lastEnabledAt })
    );

    mockFindMembershipsCreatedAfterTimeIncludeUser.mockResolvedValue([
      buildMembership({ id: 10, email: "user1@example.com", name: "User One" }),
      buildMembership({ id: 11, email: "user2@example.com", name: "User Two" }),
    ]);

    const result = await getAffectedMembersForDisable({ delegationCredentialId: "cred-1" });

    expect(mockFindMembershipsCreatedAfterTimeIncludeUser).toHaveBeenCalledWith({
      organizationId: 1,
      time: lastEnabledAt,
    });

    expect(result).toEqual([
      { email: "user1@example.com", name: "User One", id: 10 },
      { email: "user2@example.com", name: "User Two", id: 11 },
    ]);
  });

  it("only returns email, name, and id -- no extra membership fields leak through", async () => {
    const lastEnabledAt = new Date("2025-06-01");

    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(
      buildDelegationCredential({ lastEnabledAt })
    );

    mockFindMembershipsCreatedAfterTimeIncludeUser.mockResolvedValue([
      {
        ...buildMembership({ id: 5, email: "member@example.com", name: "Test Member" }),
        accepted: true,
        role: "MEMBER",
      },
    ]);

    const result = await getAffectedMembersForDisable({ delegationCredentialId: "cred-1" });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ email: "member@example.com", name: "Test Member", id: 5 });
    expect(result[0]).not.toHaveProperty("accepted");
    expect(result[0]).not.toHaveProperty("role");
  });
});
