import { describe, it, beforeEach, vi, expect } from "vitest";

import { DelegationCredentialRepository } from "@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository";

import { toggleDelegationCredentialEnabled } from "./toggleEnabled.handler";

// Mock the repository
vi.mock("@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository", () => ({
  DelegationCredentialRepository: {
    findById: vi.fn(),
    updateById: vi.fn(),
    findByIdIncludeSensitiveServiceAccountKey: vi.fn(),
  },
}));

// Mock other dependencies
vi.mock("@calcom/app-store/delegationCredential", () => ({
  checkIfSuccessfullyConfiguredInWorkspace: vi.fn().mockResolvedValue(true),
}));

vi.mock("@calcom/emails/integration-email-service", () => ({
  sendDelegationCredentialDisabledEmail: vi.fn(),
}));

vi.mock("./getAffectedMembersForDisable.handler", () => ({
  getAffectedMembersForDisable: vi.fn().mockResolvedValue([]),
}));

vi.mock("./utils", () => ({
  ensureNoServiceAccountKey: vi.fn((credential) => credential),
}));

describe("toggleDelegationCredentialEnabled - Security Fix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should prevent users without organizationId from accessing any credentials", async () => {
    const userWithoutOrg = {
      id: 1,
      email: "user@example.com",
      organizationId: null,
    };

    const input = {
      id: "any-credential",
      enabled: true,
    };

    const mockCredential = {
      id: "any-credential",
      organizationId: 1,
      enabled: false,
      workspacePlatform: { slug: "google" },
    };

    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(mockCredential);

    await expect(
      toggleDelegationCredentialEnabled(userWithoutOrg, input)
    ).rejects.toThrow("You must be part of an organization to toggle a delegation credential");

    expect(DelegationCredentialRepository.updateById).not.toHaveBeenCalled();
  });

  it("should prevent cross-organization access", async () => {
    const userFromOrg1 = {
      id: 1,
      email: "user@org1.com",
      organizationId: 1,
    };

    const input = {
      id: "org2-credential",
      enabled: false,
    };

    const org2Credential = {
      id: "org2-credential",
      organizationId: 2, // Different organization
      enabled: true,
      workspacePlatform: { slug: "google" },
    };

    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(org2Credential);

    await expect(
      toggleDelegationCredentialEnabled(userFromOrg1, input)
    ).rejects.toThrow("Delegation credential not found");

    expect(DelegationCredentialRepository.updateById).not.toHaveBeenCalled();
  });

  it("should allow same-organization access", async () => {
    const userFromOrg1 = {
      id: 1,
      email: "admin@org1.com",
      organizationId: 1,
    };

    const input = {
      id: "org1-credential",
      enabled: false,
    };

    const org1Credential = {
      id: "org1-credential",
      organizationId: 1, // Same organization
      enabled: true,
      workspacePlatform: { slug: "google" },
    };

    const updatedCredential = {
      ...org1Credential,
      enabled: false,
      lastDisabledAt: new Date(),
    };

    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(org1Credential);
    vi.mocked(DelegationCredentialRepository.updateById).mockResolvedValue(updatedCredential);

    const result = await toggleDelegationCredentialEnabled(userFromOrg1, input);

    expect(result).toEqual(updatedCredential);
    expect(DelegationCredentialRepository.updateById).toHaveBeenCalledWith({
      id: "org1-credential",
      data: {
        enabled: false,
        lastEnabledAt: undefined,
        lastDisabledAt: expect.any(Date),
      },
    });
  });

  it("should handle nonexistent credentials", async () => {
    const user = {
      id: 1,
      email: "user@org1.com",
      organizationId: 1,
    };

    const input = {
      id: "nonexistent-credential",
      enabled: true,
    };

    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(null);

    await expect(
      toggleDelegationCredentialEnabled(user, input)
    ).rejects.toThrow("Delegation credential not found");
  });
});