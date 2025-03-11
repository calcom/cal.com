import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { metadata as googleCalendarMetadata } from "@calcom/app-store/googlecalendar/_metadata";
import { metadata as googleMeetMetadata } from "@calcom/app-store/googlevideo/_metadata";
import type { ServiceAccountKey } from "@calcom/lib/server/repository/delegationCredential";
import { DelegationCredentialRepository } from "@calcom/lib/server/repository/delegationCredential";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { SMSLockState } from "@calcom/prisma/enums";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";

import {
  getAllDelegationCredentialsForUser,
  buildAllCredentials,
  getDelegationCredentialOrRegularCredential,
  enrichUsersWithDelegationCredentials,
  enrichHostsWithDelegationCredentials,
  enrichUserWithDelegationCredentialsWithoutOrgId,
  enrichUserWithDelegationConferencingCredentialsWithoutOrgId,
} from "./server";

// Mock OrganizationRepository
vi.mock("@calcom/lib/server/repository/organization", () => ({
  OrganizationRepository: {
    findByMemberEmail: vi.fn(),
  },
}));

// Mock DelegationCredentialRepository
vi.mock("@calcom/lib/server/repository/delegationCredential", () => ({
  DelegationCredentialRepository: {
    findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey: vi.fn(),
    findUniqueByOrganizationIdAndDomainIncludeSensitiveServiceAccountKey: vi.fn(),
  },
}));

const mockUser = {
  email: "test@example.com",
  id: 123,
};

const mockServiceAccountKey: ServiceAccountKey = {
  client_email: "test@example.iam.gserviceaccount.com",
  client_id: "123456789",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIE....\n-----END PRIVATE KEY-----\n",
};

const mockWorkspacePlatform = {
  name: "Test Platform",
  slug: "google",
};

const mockDelegationCredential = {
  id: "delegationCredential-1",
  enabled: true,
  domain: "example.com",
  organizationId: 1,
  serviceAccountKey: mockServiceAccountKey,
  workspacePlatform: mockWorkspacePlatform,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock organization data
const mockOrganization = {
  id: 1,
  name: "Test Org",
  metadata: {},
  bio: null,
  timeZone: "UTC",
  weekStart: "Monday",
  hideBranding: false,
  theme: null,
  timeFormat: null,
  brandColor: null,
  darkBrandColor: null,
  createdAt: new Date(),
  includeManagedEventsInLimits: false,
  smsLockState: SMSLockState.LOCKED,
  smsLockReviewedByAdmin: false,
  slug: "test-org",
  logoUrl: null,
  bannerUrl: null,
  isPrivate: false,
  isOrganization: true,
  isOrganizationVerified: true,
  isOrganizationConfigured: true,
  isOrganizationAdminReviewed: true,
  orgAutoAcceptEmail: "example.com",
  orgProfileRedirectsToVerifiedDomain: false,
  allowSEOIndexing: true,
  calVideoLogo: null,
  appLogo: null,
  appIconLogo: null,
  hideBookATeamMember: false,
  hideTeam: false,
  hideCalendarNotes: false,
  eventTypeMatchParentTeam: false,
  lockEventTypeCreationForUsers: false,
  parentId: null,
  pendingPayment: false,
  isPlatform: false,
  createdByOAuthClientId: null,
  bookingLimits: null,
};

// Credential Builders
const buildDelegationCredential = (overrides = {}) => ({
  type: "google_calendar",
  appId: "google-calendar",
  id: -1,
  delegatedToId: mockDelegationCredential.id,
  userId: mockUser.id,
  user: { email: mockUser.email },
  key: { access_token: "NOOP_UNUSED_DELEGATION_TOKEN" },
  invalid: false,
  teamId: null,
  team: null,
  delegatedTo: {
    serviceAccountKey: mockServiceAccountKey,
  },
  ...overrides,
});

const buildGoogleCalendarDelegationCredential = (overrides = {}) => ({
  ...buildDelegationCredential({
    type: googleCalendarMetadata.type,
    appId: googleCalendarMetadata.slug,
  }),
  ...overrides,
});

const buildDelegationCredentialGoogleMeetCredential = (overrides = {}) => ({
  ...buildDelegationCredential({
    type: googleMeetMetadata.type,
    appId: googleMeetMetadata.slug,
  }),
  ...overrides,
});

const buildRegularCredential = (overrides = {}): CredentialForCalendarService => ({
  type: "google_calendar",
  appId: "google-calendar",
  id: 1,
  userId: mockUser.id,
  user: { email: mockUser.email },
  key: JSON.stringify(mockServiceAccountKey),
  invalid: false,
  teamId: null,
  delegatedToId: null,
  delegatedTo: null,
  ...overrides,
});

const buildRegularGoogleCalendarCredential = (overrides = {}): CredentialPayload => ({
  ...buildRegularCredential({
    appId: "google-calendar",
    type: "google_calendar",
  }),
  ...overrides,
});

const buildMockWorkspacePlatform = (overrides: Partial<typeof mockWorkspacePlatform> = {}) => ({
  name: "Test Platform",
  slug: "google",
  ...overrides,
});

const buildMockDelegationCredential = (overrides: Partial<typeof mockDelegationCredential> = {}) => ({
  ...mockDelegationCredential,
  workspacePlatform: buildMockWorkspacePlatform(overrides.workspacePlatform || {}),
  ...overrides,
});

describe("getAllDelegationCredentialsForUser", () => {
  setupAndTeardown();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(OrganizationRepository.findByMemberEmail).mockResolvedValue(mockOrganization);
  });

  it("should return empty array when no DelegationCredential found", async () => {
    vi.mocked(
      DelegationCredentialRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(null);
    const result = await getAllDelegationCredentialsForUser({ user: mockUser });
    expect(result).toEqual([]);
  });

  it("should return empty array when DelegationCredential is disabled", async () => {
    vi.mocked(
      DelegationCredentialRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(buildMockDelegationCredential({ enabled: false }));
    const result = await getAllDelegationCredentialsForUser({ user: mockUser });
    expect(result).toEqual([]);
  });

  it("should return credentials for enabled Google DelegationCredential", async () => {
    vi.mocked(
      DelegationCredentialRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(buildMockDelegationCredential());
    const result = await getAllDelegationCredentialsForUser({ user: mockUser });

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      buildGoogleCalendarDelegationCredential(),
      buildDelegationCredentialGoogleMeetCredential(),
    ]);
  });

  it("should return empty array for non-Google platforms(as they are not supported yet)", async () => {
    vi.mocked(
      DelegationCredentialRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(
      buildMockDelegationCredential({
        workspacePlatform: {
          name: "Microsoft",
          slug: "microsoft",
        },
      })
    );
    const result = await getAllDelegationCredentialsForUser({ user: mockUser });
    expect(result).toEqual([]);
  });
});

describe("buildAllCredentials", () => {
  const mockDelegationCredentialGoogleCalendarCred = buildGoogleCalendarDelegationCredential();
  const mockRegularGoogleCalendarCred = buildRegularGoogleCalendarCredential();

  it("should combine DelegationCredential and regular credentials", () => {
    const result = buildAllCredentials({
      delegationCredentials: [mockDelegationCredentialGoogleCalendarCred],
      existingCredentials: [mockRegularGoogleCalendarCred],
    });

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(mockDelegationCredentialGoogleCalendarCred);
    expect(result).toContainEqual(mockRegularGoogleCalendarCred);
  });

  it("should deduplicate DelegationCredential credentials with same delegatedToId and appId", () => {
    const duplicateDelegationCredential = buildGoogleCalendarDelegationCredential();
    const result = buildAllCredentials({
      delegationCredentials: [mockDelegationCredentialGoogleCalendarCred, duplicateDelegationCredential],
      existingCredentials: [],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockDelegationCredentialGoogleCalendarCred);
  });

  it("should keep DelegationCredential credentials with same delegatedToId but different appId", () => {
    const differentAppDelegationCredential = buildDelegationCredentialGoogleMeetCredential();
    const result = buildAllCredentials({
      delegationCredentials: [mockDelegationCredentialGoogleCalendarCred, differentAppDelegationCredential],
      existingCredentials: [],
    });

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(mockDelegationCredentialGoogleCalendarCred);
    expect(result).toContainEqual(differentAppDelegationCredential);
  });

  it("should filter out DelegationCredential credentials from existingCredentials", () => {
    const delegatedCalendarCredential = buildRegularGoogleCalendarCredential({ id: -2 });
    const result = buildAllCredentials({
      delegationCredentials: [mockDelegationCredentialGoogleCalendarCred],
      existingCredentials: [mockRegularGoogleCalendarCred, delegatedCalendarCredential],
    });

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(mockDelegationCredentialGoogleCalendarCred);
    expect(result).toContainEqual(mockRegularGoogleCalendarCred);
  });
});

describe("getDelegationCredentialOrRegularCredential", () => {
  const mockDelegationCredentialGoogleCalendarCred = buildGoogleCalendarDelegationCredential();
  const mockRegularGoogleCalendarCred = buildRegularGoogleCalendarCredential();
  const credentials = [mockDelegationCredentialGoogleCalendarCred, mockRegularGoogleCalendarCred];

  it("should find Delegation credential by delegationCredentialId", () => {
    const result = getDelegationCredentialOrRegularCredential({
      credentials,
      id: { credentialId: null, delegationCredentialId: mockDelegationCredential.id },
    });
    expect(result).toEqual(mockDelegationCredentialGoogleCalendarCred);
  });

  it("should find regular credential by credentialId", () => {
    const result = getDelegationCredentialOrRegularCredential({
      credentials,
      id: { credentialId: mockRegularGoogleCalendarCred.id, delegationCredentialId: null },
    });
    expect(result).toEqual(mockRegularGoogleCalendarCred);
  });

  it("should return null when no matching credential found", () => {
    const result = getDelegationCredentialOrRegularCredential({
      credentials,
      id: { credentialId: 999, delegationCredentialId: null },
    });
    expect(result).toBeNull();
  });

  it("should not match null to null for delegatedToId", () => {
    const result = getDelegationCredentialOrRegularCredential({
      credentials,
      id: { credentialId: null, delegationCredentialId: null },
    });
    expect(result).toBeNull();
  });
});

describe("enrichUsersWithDelegationCredentials", () => {
  const mockUsers = [
    {
      ...mockUser,
      credentials: [buildRegularGoogleCalendarCredential()],
    },
    {
      id: 456,
      email: "test2@example.com",
      credentials: [buildRegularGoogleCalendarCredential({ id: 2 })],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return users as is when orgId is null", async () => {
    const result = await enrichUsersWithDelegationCredentials({
      orgId: null,
      users: mockUsers,
    });

    expect(result).toEqual(
      mockUsers.map((user) => ({
        ...user,
        credentials: user.credentials.map((cred) => ({
          ...cred,
          delegatedTo: null,
          delegatedToId: null,
        })),
      }))
    );
  });

  it("should enrich users with DelegationCredential credentials when available", async () => {
    vi.mocked(
      DelegationCredentialRepository.findUniqueByOrganizationIdAndDomainIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(buildMockDelegationCredential());

    const result = await enrichUsersWithDelegationCredentials({
      orgId: 1,
      users: mockUsers,
    });

    expect(result).toHaveLength(2);
    result.forEach((enrichedUser) => {
      expect(enrichedUser.credentials).toHaveLength(3); // 1 regular + 2 DelegationCredential (calendar + meet)
      expect(enrichedUser.credentials).toContainEqual(
        expect.objectContaining({
          type: googleCalendarMetadata.type,
          appId: googleCalendarMetadata.slug,
        })
      );
      expect(enrichedUser.credentials).toContainEqual(
        expect.objectContaining({
          type: googleMeetMetadata.type,
          appId: googleMeetMetadata.slug,
        })
      );
    });
  });

  it("should not add DelegationCredential credentials when DelegationCredential is disabled", async () => {
    vi.mocked(
      DelegationCredentialRepository.findUniqueByOrganizationIdAndDomainIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(buildMockDelegationCredential({ enabled: false }));

    const result = await enrichUsersWithDelegationCredentials({
      orgId: 1,
      users: mockUsers,
    });

    expect(result).toEqual(
      mockUsers.map((user) => ({
        ...user,
        credentials: user.credentials.map((cred) => ({
          ...cred,
          delegatedTo: null,
          delegatedToId: null,
        })),
      }))
    );
  });

  it("should return empty array when users is empty", async () => {
    const result = await enrichUsersWithDelegationCredentials({
      orgId: 1,
      users: [],
    });
    expect(result).toEqual([]);
  });
});

describe("enrichHostsWithDelegationCredentials", () => {
  const mockHosts = [
    {
      user: {
        ...mockUser,
        credentials: [buildRegularGoogleCalendarCredential()],
      },
      metadata: { key: "value" },
    },
    {
      user: {
        id: 456,
        email: "test2@example.com",
        credentials: [buildRegularGoogleCalendarCredential({ id: 2 })],
      },
      metadata: { key: "value2" },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return hosts as is when orgId is null", async () => {
    const result = await enrichHostsWithDelegationCredentials({
      orgId: null,
      hosts: mockHosts,
    });

    expect(result).toEqual(
      mockHosts.map((host) => ({
        ...host,
        user: {
          ...host.user,
          credentials: host.user.credentials.map((cred) => ({
            ...cred,
            delegatedTo: null,
            delegatedToId: null,
          })),
        },
      }))
    );
  });

  it("should enrich hosts with DelegationCredential credentials when available", async () => {
    vi.mocked(
      DelegationCredentialRepository.findUniqueByOrganizationIdAndDomainIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(buildMockDelegationCredential());

    const result = await enrichHostsWithDelegationCredentials({
      orgId: 1,
      hosts: mockHosts,
    });

    expect(result).toHaveLength(2);
    result.forEach((enrichedHost) => {
      expect(enrichedHost.metadata).toBeDefined(); // Preserve non-user data
      expect(enrichedHost.user.credentials).toHaveLength(3); // 1 regular + 2 DelegationCredential (calendar + meet)
      expect(enrichedHost.user.credentials).toContainEqual(
        expect.objectContaining({
          type: googleCalendarMetadata.type,
          appId: googleCalendarMetadata.slug,
        })
      );
      expect(enrichedHost.user.credentials).toContainEqual(
        expect.objectContaining({
          type: googleMeetMetadata.type,
          appId: googleMeetMetadata.slug,
        })
      );
    });
  });

  it("should not add DelegationCredential credentials when DelegationCredential is disabled", async () => {
    vi.mocked(
      DelegationCredentialRepository.findUniqueByOrganizationIdAndDomainIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(buildMockDelegationCredential({ enabled: false }));

    const result = await enrichHostsWithDelegationCredentials({
      orgId: 1,
      hosts: mockHosts,
    });

    expect(result).toEqual(
      mockHosts.map((host) => ({
        ...host,
        user: {
          ...host.user,
          credentials: host.user.credentials.map((cred) => ({
            ...cred,
            delegatedTo: null,
            delegatedToId: null,
          })),
        },
      }))
    );
  });

  it("should return empty array when hosts is empty", async () => {
    const result = await enrichHostsWithDelegationCredentials({
      orgId: 1,
      hosts: [],
    });
    expect(result).toEqual([]);
  });
});

describe("enrichUserWithDelegationCredentialsWithoutOrgId", () => {
  const mockUserWithCredentials = {
    ...mockUser,
    credentials: [buildRegularGoogleCalendarCredential()],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should enrich user with DelegationCredential credentials when available", async () => {
    vi.mocked(
      DelegationCredentialRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(buildMockDelegationCredential());

    const result = await enrichUserWithDelegationCredentialsWithoutOrgId({
      user: mockUserWithCredentials,
    });

    expect(result.credentials).toHaveLength(3); // 1 regular + 2 DelegationCredential (calendar + meet)
    expect(result.credentials).toContainEqual(
      expect.objectContaining({
        type: googleCalendarMetadata.type,
        appId: googleCalendarMetadata.slug,
      })
    );
    expect(result.credentials).toContainEqual(
      expect.objectContaining({
        type: googleMeetMetadata.type,
        appId: googleMeetMetadata.slug,
      })
    );
  });

  it("should not add DelegationCredential credentials when DelegationCredential is not found", async () => {
    vi.mocked(
      DelegationCredentialRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(null);

    const result = await enrichUserWithDelegationCredentialsWithoutOrgId({
      user: mockUserWithCredentials,
    });

    expect(result).toEqual({
      ...mockUserWithCredentials,
      credentials: mockUserWithCredentials.credentials.map((cred) => ({
        ...cred,
        delegatedTo: null,
        delegatedToId: null,
      })),
    });
  });

  it("should not add DelegationCredential credentials when DelegationCredential is disabled", async () => {
    vi.mocked(
      DelegationCredentialRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(buildMockDelegationCredential({ enabled: false }));

    const result = await enrichUserWithDelegationCredentialsWithoutOrgId({
      user: mockUserWithCredentials,
    });

    expect(result).toEqual({
      ...mockUserWithCredentials,
      credentials: mockUserWithCredentials.credentials.map((cred) => ({
        ...cred,
        delegatedTo: null,
        delegatedToId: null,
      })),
    });
  });
});

describe("enrichUserWithDelegationConferencingCredentialsWithoutOrgId", () => {
  const mockUserWithCredentials = {
    ...mockUser,
    credentials: [buildRegularGoogleCalendarCredential()],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should only return conferencing credentials", async () => {
    vi.mocked(
      DelegationCredentialRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(buildMockDelegationCredential());

    const result = await enrichUserWithDelegationConferencingCredentialsWithoutOrgId({
      user: mockUserWithCredentials,
    });

    expect(result.credentials).toHaveLength(1); // Only Google Meet
    expect(result.credentials[0]).toEqual(
      expect.objectContaining({
        type: googleMeetMetadata.type,
        appId: googleMeetMetadata.slug,
      })
    );
  });

  it("should return empty credentials array when no conferencing credentials found", async () => {
    vi.mocked(
      DelegationCredentialRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(null);

    const result = await enrichUserWithDelegationConferencingCredentialsWithoutOrgId({
      user: mockUserWithCredentials,
    });

    expect(result.credentials).toEqual([]);
  });
});
