import { DelegationCredentialRepository } from "@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TRPCError } from "@trpc/server";

import {
  InvalidServiceAccountKeyError,
  ensureDelegationCredentialNotAlreadyConfigured,
  ensureNoServiceAccountKey,
  handleDelegationCredentialError,
  parseServiceAccountKey,
} from "./utils";

vi.mock("@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository", () => ({
  DelegationCredentialRepository: {
    findAllByDomain: vi.fn(),
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

function buildServiceAccountKey(overrides?: Partial<{ client_id: string; client_email: string; private_key: string }>) {
  return {
    client_id: "123",
    private_key: "-----BEGIN RSA PRIVATE KEY-----",
    client_email: "test@project.iam.gserviceaccount.com",
    ...overrides,
  };
}

describe("domain uniqueness check (ensureDelegationCredentialNotAlreadyConfigured)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows creating a credential when no existing credentials use the domain", async () => {
    vi.mocked(DelegationCredentialRepository.findAllByDomain).mockResolvedValue([]);

    await expect(
      ensureDelegationCredentialNotAlreadyConfigured({
        domain: "newdomain.com",
        currentOrganizationId: 1,
        delegationCredentialBeingUpdatedId: null,
      })
    ).resolves.not.toThrow();
  });

  it("prevents creating when the same org already has a credential for the domain", async () => {
    vi.mocked(DelegationCredentialRepository.findAllByDomain).mockResolvedValue([
      buildDelegationCredential(),
    ]);

    await expect(
      ensureDelegationCredentialNotAlreadyConfigured({
        domain: "example.com",
        currentOrganizationId: 1,
        delegationCredentialBeingUpdatedId: null,
      })
    ).rejects.toThrow("Your organization already has delegation credential for example.com");
  });

  it("prevents creating when a different org has an enabled credential for the domain", async () => {
    vi.mocked(DelegationCredentialRepository.findAllByDomain).mockResolvedValue([
      buildDelegationCredential({ organizationId: 2 }),
    ]);

    await expect(
      ensureDelegationCredentialNotAlreadyConfigured({
        domain: "example.com",
        currentOrganizationId: 1,
        delegationCredentialBeingUpdatedId: null,
      })
    ).rejects.toThrow("Domain example.com already has delegation credential enabled in another organization");
  });

  it("allows updating a credential's own domain without conflict", async () => {
    vi.mocked(DelegationCredentialRepository.findAllByDomain).mockResolvedValue([
      buildDelegationCredential({ id: "my-credential-id" }),
    ]);

    await expect(
      ensureDelegationCredentialNotAlreadyConfigured({
        domain: "example.com",
        currentOrganizationId: 1,
        delegationCredentialBeingUpdatedId: "my-credential-id",
      })
    ).resolves.not.toThrow();
  });

  it("allows creating when a different org has a disabled credential for the domain", async () => {
    vi.mocked(DelegationCredentialRepository.findAllByDomain).mockResolvedValue([
      buildDelegationCredential({ organizationId: 2, enabled: false }),
    ]);

    await expect(
      ensureDelegationCredentialNotAlreadyConfigured({
        domain: "example.com",
        currentOrganizationId: 1,
        delegationCredentialBeingUpdatedId: null,
      })
    ).resolves.not.toThrow();
  });
});

describe("service account key parsing (parseServiceAccountKey)", () => {
  it("parses a valid service account key with all required fields", () => {
    const key = buildServiceAccountKey();

    const result = parseServiceAccountKey(key);

    expect(result).toEqual(key);
  });

  it("throws InvalidServiceAccountKeyError when required fields are missing", () => {
    const incompleteKey = { client_id: "123" };

    expect(() => parseServiceAccountKey(incompleteKey)).toThrow(InvalidServiceAccountKeyError);
    expect(() => parseServiceAccountKey(incompleteKey)).toThrow(
      "Service account key must contain private_key, client_email and client_id"
    );
  });

  it("returns null for null input", () => {
    expect(parseServiceAccountKey(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(parseServiceAccountKey(undefined as unknown as null)).toBeNull();
  });
});

describe("service account key stripping (ensureNoServiceAccountKey)", () => {
  it("removes the serviceAccountKey from the returned object", () => {
    const input = {
      id: "test-id",
      domain: "example.com",
      serviceAccountKey: buildServiceAccountKey(),
    };

    const result = ensureNoServiceAccountKey(input);

    expect(result).toEqual({
      id: "test-id",
      domain: "example.com",
      serviceAccountKey: undefined,
    });
    expect(result).not.toHaveProperty("serviceAccountKey", buildServiceAccountKey());
  });

  it("returns null when given null input", () => {
    expect(ensureNoServiceAccountKey(null)).toBeNull();
  });
});

describe("error handling (handleDelegationCredentialError)", () => {
  it("wraps InvalidServiceAccountKeyError as a BAD_REQUEST TRPCError", () => {
    const error = new InvalidServiceAccountKeyError("Invalid key format");

    expect(() => handleDelegationCredentialError(error)).toThrow(TRPCError);
    try {
      handleDelegationCredentialError(error);
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
      expect((e as TRPCError).message).toBe("Invalid key format");
    }
  });

  it("re-throws an existing TRPCError unchanged", () => {
    const error = new TRPCError({ code: "NOT_FOUND", message: "Not found" });

    expect(() => handleDelegationCredentialError(error)).toThrow(TRPCError);
    try {
      handleDelegationCredentialError(error);
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("NOT_FOUND");
      expect((e as TRPCError).message).toBe("Not found");
    }
  });

  it("wraps unexpected errors as INTERNAL_SERVER_ERROR", () => {
    const error = new Error("Something unexpected");

    expect(() => handleDelegationCredentialError(error)).toThrow(TRPCError);
    try {
      handleDelegationCredentialError(error);
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
      expect((e as TRPCError).message).toBe(
        "An error occurred while handling delegation credential settings."
      );
    }
  });
});
