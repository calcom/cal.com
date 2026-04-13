import { assertSuccessfullyConfiguredInWorkspace } from "@calcom/app-store/delegationCredential";
import { sendDelegationCredentialDisabledEmail } from "@calcom/emails/integration-email-service";
import { DelegationCredentialRepository } from "@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";

import toggleEnabledHandler, { toggleDelegationCredentialEnabled } from "./toggleEnabled.handler";

// --- Repositories (data access layer) ---
vi.mock("@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository", () => ({
  DelegationCredentialRepository: {
    findById: vi.fn(),
    updateById: vi.fn(),
    findByIdIncludeSensitiveServiceAccountKey: vi.fn(),
  },
}));

const mockFindMembershipsCreatedAfterTimeIncludeUser = vi.fn();
vi.mock("@calcom/features/di/containers/MembershipRepository", () => ({
  getMembershipRepository: () => ({
    findMembershipsCreatedAfterTimeIncludeUser: mockFindMembershipsCreatedAfterTimeIncludeUser,
  }),
}));

// --- External I/O (must mock -- makes real API calls to workspace providers) ---
vi.mock("@calcom/app-store/delegationCredential", () => ({
  assertSuccessfullyConfiguredInWorkspace: vi.fn().mockResolvedValue(undefined),
}));

// --- External I/O (must mock -- sends real emails) ---
vi.mock("@calcom/emails/integration-email-service", () => ({
  sendDelegationCredentialDisabledEmail: vi.fn().mockResolvedValue(undefined),
}));

// --- i18n (must mock -- reads translation files from disk) ---
vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

// --- Builders ---

function buildUser(overrides?: Partial<{ id: number; email: string; organizationId: number | null }>) {
  return {
    id: 1,
    email: "admin@org.com",
    organizationId: 1,
    ...overrides,
  };
}

function buildDelegationCredential(overrides?: Record<string, unknown>) {
  return {
    id: "cred-1",
    domain: "example.com",
    organizationId: 1,
    enabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastEnabledAt: null,
    lastDisabledAt: null,
    workspacePlatform: { name: "Google Workspace", slug: "google" },
    ...overrides,
  };
}

function buildDelegationCredentialWithKey(overrides?: Record<string, unknown>) {
  return {
    ...buildDelegationCredential(),
    serviceAccountKey: {
      client_id: "sa-client-123",
      client_email: "sa@project.iam.gserviceaccount.com",
      private_key: "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
    },
    ...overrides,
  };
}

function buildInput(overrides?: Partial<{ id: string; enabled: boolean }>) {
  return {
    id: "cred-1",
    enabled: true,
    ...overrides,
  };
}

function buildMembership(overrides?: Partial<{ id: number; email: string; name: string }>) {
  return {
    user: {
      id: overrides?.id ?? 10,
      email: overrides?.email ?? "member@example.com",
      name: overrides?.name ?? "Test Member",
    },
  };
}

describe("toggle delegation credential enabled/disabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock implementations (clearAllMocks only resets call history, not implementations)
    vi.mocked(assertSuccessfullyConfiguredInWorkspace).mockResolvedValue(undefined);
    vi.mocked(sendDelegationCredentialDisabledEmail).mockResolvedValue(undefined);
  });

  // --- Auth & access control ---

  it("rejects when user is not part of an organization", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(
      buildDelegationCredential({ organizationId: 1 })
    );

    await expect(
      toggleDelegationCredentialEnabled(buildUser({ organizationId: null }), buildInput())
    ).rejects.toThrow("You must be part of an organization to toggle a delegation credential");

    expect(DelegationCredentialRepository.updateById).not.toHaveBeenCalled();
  });

  it("rejects when the credential belongs to a different organization", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(
      buildDelegationCredential({ organizationId: 2 })
    );

    await expect(
      toggleDelegationCredentialEnabled(buildUser({ organizationId: 1 }), buildInput())
    ).rejects.toThrow("Delegation credential not found");

    expect(DelegationCredentialRepository.updateById).not.toHaveBeenCalled();
  });

  it("rejects when the credential does not exist", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(null);

    await expect(
      toggleDelegationCredentialEnabled(buildUser(), buildInput({ id: "nonexistent" }))
    ).rejects.toThrow("Delegation credential not found");
  });

  // --- No-op when already in desired state ---

  it("returns the credential unchanged when it is already in the desired state", async () => {
    const credential = buildDelegationCredential({ enabled: true });
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(credential);

    const result = await toggleDelegationCredentialEnabled(
      buildUser(),
      buildInput({ enabled: true })
    );

    expect(result).toEqual(credential);
    expect(DelegationCredentialRepository.updateById).not.toHaveBeenCalled();
  });

  // --- Enable flow ---

  it("validates workspace configuration before enabling a credential", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(
      buildDelegationCredential({ enabled: false })
    );
    vi.mocked(DelegationCredentialRepository.findByIdIncludeSensitiveServiceAccountKey).mockResolvedValue(
      buildDelegationCredentialWithKey()
    );

    const updatedCredential = buildDelegationCredential({
      id: "cred-1",
      enabled: true,
      lastEnabledAt: new Date(),
    });
    vi.mocked(DelegationCredentialRepository.updateById).mockResolvedValue(updatedCredential);

    await toggleDelegationCredentialEnabled(buildUser(), buildInput({ enabled: true }));

    expect(assertSuccessfullyConfiguredInWorkspace).toHaveBeenCalledWith({
      delegationCredential: expect.objectContaining({
        serviceAccountKey: expect.objectContaining({ client_id: "sa-client-123" }),
      }),
      user: expect.objectContaining({ id: 1, email: "admin@org.com" }),
    });

    expect(DelegationCredentialRepository.updateById).toHaveBeenCalledWith({
      id: "cred-1",
      data: {
        enabled: true,
        lastEnabledAt: expect.any(Date),
        lastDisabledAt: undefined,
      },
    });
  });

  it("rejects enabling when the credential has no service account key", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(
      buildDelegationCredential({ enabled: false })
    );
    vi.mocked(DelegationCredentialRepository.findByIdIncludeSensitiveServiceAccountKey).mockResolvedValue(
      buildDelegationCredentialWithKey({ serviceAccountKey: null })
    );

    await expect(
      toggleDelegationCredentialEnabled(buildUser(), buildInput({ enabled: true }))
    ).rejects.toThrow("Domain wide delegation doesn't have service account key");

    expect(DelegationCredentialRepository.updateById).not.toHaveBeenCalled();
  });

  it("rejects enabling when the credential is not found by sensitive query", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(
      buildDelegationCredential({ enabled: false })
    );
    vi.mocked(DelegationCredentialRepository.findByIdIncludeSensitiveServiceAccountKey).mockResolvedValue(
      null
    );

    await expect(
      toggleDelegationCredentialEnabled(buildUser(), buildInput({ enabled: true }))
    ).rejects.toThrow("Domain wide delegation not found");
  });

  // --- Disable flow ---

  it("sends Google-specific notification emails to affected members when disabling", async () => {
    const lastEnabledAt = new Date("2025-01-01");
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(
      buildDelegationCredential({
        enabled: true,
        lastEnabledAt,
        workspacePlatform: { name: "Google Workspace", slug: "google" },
      })
    );

    mockFindMembershipsCreatedAfterTimeIncludeUser.mockResolvedValue([
      buildMembership({ id: 10, email: "user1@example.com", name: "User One" }),
      buildMembership({ id: 11, email: "user2@example.com", name: "User Two" }),
    ]);

    const updatedCredential = buildDelegationCredential({
      id: "cred-1",
      enabled: false,
      lastDisabledAt: new Date(),
    });
    vi.mocked(DelegationCredentialRepository.updateById).mockResolvedValue(updatedCredential);

    await toggleDelegationCredentialEnabled(buildUser(), buildInput({ enabled: false }));

    expect(sendDelegationCredentialDisabledEmail).toHaveBeenCalledTimes(2);
    expect(sendDelegationCredentialDisabledEmail).toHaveBeenCalledWith({
      recipientEmail: "user1@example.com",
      recipientName: "User One",
      calendarAppName: "Google Calendar",
      conferencingAppName: "Google Meet",
    });
    expect(sendDelegationCredentialDisabledEmail).toHaveBeenCalledWith({
      recipientEmail: "user2@example.com",
      recipientName: "User Two",
      calendarAppName: "Google Calendar",
      conferencingAppName: "Google Meet",
    });
  });

  it("sends Microsoft-specific notification emails when disabling an Office 365 credential", async () => {
    const lastEnabledAt = new Date("2025-01-01");
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(
      buildDelegationCredential({
        enabled: true,
        lastEnabledAt,
        workspacePlatform: { name: "Microsoft 365", slug: "office365" },
      })
    );

    mockFindMembershipsCreatedAfterTimeIncludeUser.mockResolvedValue([
      buildMembership({ id: 20, email: "user@msorg.com", name: "MS User" }),
    ]);

    const updatedCredential = buildDelegationCredential({
      id: "cred-1",
      enabled: false,
      lastDisabledAt: new Date(),
    });
    vi.mocked(DelegationCredentialRepository.updateById).mockResolvedValue(updatedCredential);

    await toggleDelegationCredentialEnabled(buildUser(), buildInput({ enabled: false }));

    expect(sendDelegationCredentialDisabledEmail).toHaveBeenCalledWith({
      recipientEmail: "user@msorg.com",
      recipientName: "MS User",
      calendarAppName: "Microsoft 365",
      conferencingAppName: "Microsoft Teams",
    });
  });

  it("rejects disabling when the credential has an unsupported platform slug", async () => {
    const lastEnabledAt = new Date("2025-01-01");
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(
      buildDelegationCredential({
        enabled: true,
        lastEnabledAt,
        workspacePlatform: { name: "Unknown", slug: "unknown-platform" },
      })
    );

    mockFindMembershipsCreatedAfterTimeIncludeUser.mockResolvedValue([buildMembership()]);

    await expect(
      toggleDelegationCredentialEnabled(buildUser(), buildInput({ enabled: false }))
    ).rejects.toThrow("Unsupported workspace platform slug: unknown-platform");
  });

  it("sends no emails when there are no affected members", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(
      buildDelegationCredential({
        enabled: true,
        lastEnabledAt: null,
        workspacePlatform: { name: "Google Workspace", slug: "google" },
      })
    );

    const updatedCredential = buildDelegationCredential({
      id: "cred-1",
      enabled: false,
      lastDisabledAt: new Date(),
    });
    vi.mocked(DelegationCredentialRepository.updateById).mockResolvedValue(updatedCredential);

    await toggleDelegationCredentialEnabled(buildUser(), buildInput({ enabled: false }));

    expect(sendDelegationCredentialDisabledEmail).not.toHaveBeenCalled();
    expect(DelegationCredentialRepository.updateById).toHaveBeenCalledWith({
      id: "cred-1",
      data: {
        enabled: false,
        lastEnabledAt: undefined,
        lastDisabledAt: expect.any(Date),
      },
    });
  });

  // --- Response shape ---

  it("does not expose the service account key in the response after disabling", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(
      buildDelegationCredential({ enabled: true, lastEnabledAt: null })
    );

    vi.mocked(DelegationCredentialRepository.updateById).mockResolvedValue(
      buildDelegationCredential({
        id: "cred-1",
        enabled: false,
        serviceAccountKey: { client_id: "secret", encrypted_credentials: "enc" },
      })
    );

    const result = await toggleDelegationCredentialEnabled(buildUser(), buildInput({ enabled: false }));

    expect(result).toBeDefined();
    expect(result!.serviceAccountKey).toBeUndefined();
    expect(result!.id).toBe("cred-1");
  });

  // --- Email verification (wrapper handler) ---

  it("rejects when the user's email is not verified", async () => {
    await expect(
      toggleEnabledHandler({
        ctx: {
          user: {
            id: 1,
            email: "admin@org.com",
            locale: "en",
            emailVerified: null,
            organizationId: 1,
          },
        },
        input: buildInput(),
      })
    ).rejects.toThrow("verify_your_email");

    expect(DelegationCredentialRepository.updateById).not.toHaveBeenCalled();
  });

  // --- Enable flow: workspace validation failure ---

  it("propagates the error when workspace configuration validation fails during enable", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(
      buildDelegationCredential({ enabled: false })
    );
    vi.mocked(DelegationCredentialRepository.findByIdIncludeSensitiveServiceAccountKey).mockResolvedValue(
      buildDelegationCredentialWithKey()
    );
    vi.mocked(assertSuccessfullyConfiguredInWorkspace).mockRejectedValue(
      new Error("Workspace is not properly configured")
    );

    await expect(
      toggleDelegationCredentialEnabled(buildUser(), buildInput({ enabled: true }))
    ).rejects.toThrow("Workspace is not properly configured");

    expect(DelegationCredentialRepository.updateById).not.toHaveBeenCalled();
  });

  // --- Disable flow: edge cases ---

  it("skips sending email to members without an email address", async () => {
    const lastEnabledAt = new Date("2025-01-01");
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(
      buildDelegationCredential({
        enabled: true,
        lastEnabledAt,
        workspacePlatform: { name: "Google Workspace", slug: "google" },
      })
    );

    mockFindMembershipsCreatedAfterTimeIncludeUser.mockResolvedValue([
      buildMembership({ id: 10, email: "has-email@example.com", name: "Has Email" }),
      { user: { id: 11, email: null, name: "No Email" } },
      { user: { id: 12, email: "", name: "Empty Email" } },
    ]);

    const updatedCredential = buildDelegationCredential({ enabled: false, lastDisabledAt: new Date() });
    vi.mocked(DelegationCredentialRepository.updateById).mockResolvedValue(updatedCredential);

    await toggleDelegationCredentialEnabled(buildUser(), buildInput({ enabled: false }));

    expect(sendDelegationCredentialDisabledEmail).toHaveBeenCalledTimes(1);
    expect(sendDelegationCredentialDisabledEmail).toHaveBeenCalledWith(
      expect.objectContaining({ recipientEmail: "has-email@example.com" })
    );
  });

  it("sends undefined as recipientName when the member has no name", async () => {
    const lastEnabledAt = new Date("2025-01-01");
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(
      buildDelegationCredential({
        enabled: true,
        lastEnabledAt,
        workspacePlatform: { name: "Google Workspace", slug: "google" },
      })
    );

    mockFindMembershipsCreatedAfterTimeIncludeUser.mockResolvedValue([
      buildMembership({ id: 10, email: "user@example.com", name: "" }),
    ]);

    const updatedCredential = buildDelegationCredential({ enabled: false, lastDisabledAt: new Date() });
    vi.mocked(DelegationCredentialRepository.updateById).mockResolvedValue(updatedCredential);

    await toggleDelegationCredentialEnabled(buildUser(), buildInput({ enabled: false }));

    expect(sendDelegationCredentialDisabledEmail).toHaveBeenCalledWith(
      expect.objectContaining({ recipientName: undefined })
    );
  });

  it("rejects disabling when the credential has no workspacePlatform at all", async () => {
    const lastEnabledAt = new Date("2025-01-01");
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(
      buildDelegationCredential({
        enabled: true,
        lastEnabledAt,
        workspacePlatform: null,
      })
    );

    mockFindMembershipsCreatedAfterTimeIncludeUser.mockResolvedValue([buildMembership()]);

    await expect(
      toggleDelegationCredentialEnabled(buildUser(), buildInput({ enabled: false }))
    ).rejects.toThrow("Unsupported workspace platform slug: undefined");
  });

  // --- Response shape ---

  it("does not expose the service account key in the response after enabling", async () => {
    vi.mocked(DelegationCredentialRepository.findById).mockResolvedValue(
      buildDelegationCredential({ enabled: false })
    );
    vi.mocked(DelegationCredentialRepository.findByIdIncludeSensitiveServiceAccountKey).mockResolvedValue(
      buildDelegationCredentialWithKey()
    );
    vi.mocked(DelegationCredentialRepository.updateById).mockResolvedValue(
      buildDelegationCredential({
        id: "cred-1",
        enabled: true,
        serviceAccountKey: { client_id: "secret", encrypted_credentials: "enc" },
      })
    );

    const result = await toggleDelegationCredentialEnabled(buildUser(), buildInput({ enabled: true }));

    expect(result).toBeDefined();
    expect(result!.serviceAccountKey).toBeUndefined();
    expect(result!.id).toBe("cred-1");
  });
});
