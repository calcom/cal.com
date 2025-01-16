import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { metadata as googleCalendarMetadata } from "@calcom/app-store/googlecalendar/_metadata";
import { metadata as googleMeetMetadata } from "@calcom/app-store/googlevideo/_metadata";
import type { ServiceAccountKey } from "@calcom/lib/server/repository/domainWideDelegation";
import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { SMSLockState } from "@calcom/prisma/enums";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";

import {
  getAllDwdCredentialsForUser,
  buildAllCredentials,
  getDwdOrRegularCredential,
  enrichUsersWithDwdCredentials,
  enrichHostsWithDwdCredentials,
  enrichUserWithDwdCredentialsWithoutOrgId,
  enrichUserWithDwdConferencingCredentialsWithoutOrgId,
} from "./server";

// Mock OrganizationRepository
vi.mock("@calcom/lib/server/repository/organization", () => ({
  OrganizationRepository: {
    findByMemberEmail: vi.fn(),
  },
}));

// Mock DomainWideDelegationRepository
vi.mock("@calcom/lib/server/repository/domainWideDelegation", () => ({
  DomainWideDelegationRepository: {
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

const mockDwd = {
  id: "dwd-1",
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
const buildDwdCredential = (overrides = {}) => ({
  type: "google_calendar",
  appId: "google-calendar",
  id: -1,
  delegatedToId: mockDwd.id,
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

const buildDwdGoogleCalendarCredential = (overrides = {}) => ({
  ...buildDwdCredential({
    type: googleCalendarMetadata.type,
    appId: googleCalendarMetadata.slug,
  }),
  ...overrides,
});

const buildDwdGoogleMeetCredential = (overrides = {}) => ({
  ...buildDwdCredential({
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

const buildMockDwd = (overrides: Partial<typeof mockDwd> = {}) => ({
  ...mockDwd,
  workspacePlatform: buildMockWorkspacePlatform(overrides.workspacePlatform || {}),
  ...overrides,
});

describe("getAllDwdCredentialsForUser", () => {
  setupAndTeardown();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(OrganizationRepository.findByMemberEmail).mockResolvedValue(mockOrganization);
  });

  it("should return empty array when no DWD found", async () => {
    vi.mocked(
      DomainWideDelegationRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(null);
    const result = await getAllDwdCredentialsForUser({ user: mockUser });
    expect(result).toEqual([]);
  });

  it("should return empty array when DWD is disabled", async () => {
    vi.mocked(
      DomainWideDelegationRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(buildMockDwd({ enabled: false }));
    const result = await getAllDwdCredentialsForUser({ user: mockUser });
    expect(result).toEqual([]);
  });

  it("should return credentials for enabled Google DWD", async () => {
    vi.mocked(
      DomainWideDelegationRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(buildMockDwd());
    const result = await getAllDwdCredentialsForUser({ user: mockUser });

    expect(result).toHaveLength(2);
    expect(result).toEqual([buildDwdGoogleCalendarCredential(), buildDwdGoogleMeetCredential()]);
  });

  it("should return empty array for non-Google platforms(as they are not supported yet)", async () => {
    vi.mocked(
      DomainWideDelegationRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(
      buildMockDwd({
        workspacePlatform: {
          name: "Microsoft",
          slug: "microsoft",
        },
      })
    );
    const result = await getAllDwdCredentialsForUser({ user: mockUser });
    expect(result).toEqual([]);
  });
});

describe("buildAllCredentials", () => {
  const mockDwdGoogleCalendarCred = buildDwdGoogleCalendarCredential();
  const mockRegularGoogleCalendarCred = buildRegularGoogleCalendarCredential();

  it("should combine DWD and regular credentials", () => {
    const result = buildAllCredentials({
      dwdCredentials: [mockDwdGoogleCalendarCred],
      existingCredentials: [mockRegularGoogleCalendarCred],
    });

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(mockDwdGoogleCalendarCred);
    expect(result).toContainEqual(mockRegularGoogleCalendarCred);
  });

  it("should deduplicate DWD credentials with same delegatedToId and appId", () => {
    const duplicateDwdCredential = buildDwdGoogleCalendarCredential();
    const result = buildAllCredentials({
      dwdCredentials: [mockDwdGoogleCalendarCred, duplicateDwdCredential],
      existingCredentials: [],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockDwdGoogleCalendarCred);
  });

  it("should keep DWD credentials with same delegatedToId but different appId", () => {
    const differentAppDwdCredential = buildDwdGoogleMeetCredential();
    const result = buildAllCredentials({
      dwdCredentials: [mockDwdGoogleCalendarCred, differentAppDwdCredential],
      existingCredentials: [],
    });

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(mockDwdGoogleCalendarCred);
    expect(result).toContainEqual(differentAppDwdCredential);
  });

  it("should filter out DWD credentials from existingCredentials", () => {
    const dwdCalendarCredential = buildRegularGoogleCalendarCredential({ id: -2 });
    const result = buildAllCredentials({
      dwdCredentials: [mockDwdGoogleCalendarCred],
      existingCredentials: [mockRegularGoogleCalendarCred, dwdCalendarCredential],
    });

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(mockDwdGoogleCalendarCred);
    expect(result).toContainEqual(mockRegularGoogleCalendarCred);
  });
});

describe("getDwdOrRegularCredential", () => {
  const mockDwdGoogleCalendarCred = buildDwdGoogleCalendarCredential();
  const mockRegularGoogleCalendarCred = buildRegularGoogleCalendarCredential();
  const credentials = [mockDwdGoogleCalendarCred, mockRegularGoogleCalendarCred];

  it("should find DWD credential by dwdId", () => {
    const result = getDwdOrRegularCredential({
      credentials,
      id: { credentialId: null, dwdId: mockDwd.id },
    });
    expect(result).toEqual(mockDwdGoogleCalendarCred);
  });

  it("should find regular credential by credentialId", () => {
    const result = getDwdOrRegularCredential({
      credentials,
      id: { credentialId: mockRegularGoogleCalendarCred.id, dwdId: null },
    });
    expect(result).toEqual(mockRegularGoogleCalendarCred);
  });

  it("should return null when no matching credential found", () => {
    const result = getDwdOrRegularCredential({
      credentials,
      id: { credentialId: 999, dwdId: null },
    });
    expect(result).toBeNull();
  });

  it("should not match null to null for delegatedToId", () => {
    const result = getDwdOrRegularCredential({
      credentials,
      id: { credentialId: null, dwdId: null },
    });
    expect(result).toBeNull();
  });
});

describe("enrichUsersWithDwdCredentials", () => {
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
    const result = await enrichUsersWithDwdCredentials({
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

  it("should enrich users with DWD credentials when available", async () => {
    vi.mocked(
      DomainWideDelegationRepository.findUniqueByOrganizationIdAndDomainIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(buildMockDwd());

    const result = await enrichUsersWithDwdCredentials({
      orgId: 1,
      users: mockUsers,
    });

    expect(result).toHaveLength(2);
    result.forEach((enrichedUser) => {
      expect(enrichedUser.credentials).toHaveLength(3); // 1 regular + 2 DWD (calendar + meet)
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

  it("should not add DWD credentials when DWD is disabled", async () => {
    vi.mocked(
      DomainWideDelegationRepository.findUniqueByOrganizationIdAndDomainIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(buildMockDwd({ enabled: false }));

    const result = await enrichUsersWithDwdCredentials({
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
});

describe("enrichHostsWithDwdCredentials", () => {
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
    const result = await enrichHostsWithDwdCredentials({
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

  it("should enrich hosts with DWD credentials when available", async () => {
    vi.mocked(
      DomainWideDelegationRepository.findUniqueByOrganizationIdAndDomainIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(buildMockDwd());

    const result = await enrichHostsWithDwdCredentials({
      orgId: 1,
      hosts: mockHosts,
    });

    expect(result).toHaveLength(2);
    result.forEach((enrichedHost) => {
      expect(enrichedHost.metadata).toBeDefined(); // Preserve non-user data
      expect(enrichedHost.user.credentials).toHaveLength(3); // 1 regular + 2 DWD (calendar + meet)
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

  it("should not add DWD credentials when DWD is disabled", async () => {
    vi.mocked(
      DomainWideDelegationRepository.findUniqueByOrganizationIdAndDomainIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(buildMockDwd({ enabled: false }));

    const result = await enrichHostsWithDwdCredentials({
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
});

describe("enrichUserWithDwdCredentialsWithoutOrgId", () => {
  const mockUserWithCredentials = {
    ...mockUser,
    credentials: [buildRegularGoogleCalendarCredential()],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should enrich user with DWD credentials when available", async () => {
    vi.mocked(
      DomainWideDelegationRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(buildMockDwd());

    const result = await enrichUserWithDwdCredentialsWithoutOrgId({
      user: mockUserWithCredentials,
    });

    expect(result.credentials).toHaveLength(3); // 1 regular + 2 DWD (calendar + meet)
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

  it("should not add DWD credentials when DWD is not found", async () => {
    vi.mocked(
      DomainWideDelegationRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(null);

    const result = await enrichUserWithDwdCredentialsWithoutOrgId({
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

  it("should not add DWD credentials when DWD is disabled", async () => {
    vi.mocked(
      DomainWideDelegationRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(buildMockDwd({ enabled: false }));

    const result = await enrichUserWithDwdCredentialsWithoutOrgId({
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

describe("enrichUserWithDwdConferencingCredentialsWithoutOrgId", () => {
  const mockUserWithCredentials = {
    ...mockUser,
    credentials: [buildRegularGoogleCalendarCredential()],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should only return conferencing credentials", async () => {
    vi.mocked(
      DomainWideDelegationRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(buildMockDwd());

    const result = await enrichUserWithDwdConferencingCredentialsWithoutOrgId({
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
      DomainWideDelegationRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey
    ).mockResolvedValue(null);

    const result = await enrichUserWithDwdConferencingCredentialsWithoutOrgId({
      user: mockUserWithCredentials,
    });

    expect(result.credentials).toEqual([]);
  });
});
