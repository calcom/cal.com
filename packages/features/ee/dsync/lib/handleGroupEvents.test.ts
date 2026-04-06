import { describe, expect, it, vi, beforeEach } from "vitest";
import type { DirectorySyncEvent } from "@boxyhq/saml-jackson";

import { IdentityProvider, MembershipRole } from "@calcom/prisma/enums";

const mockLog = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => mockLog,
  },
}));

vi.mock("@calcom/lib/safeStringify", () => ({
  safeStringify: (obj: unknown) => JSON.stringify(obj),
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

const mockGetTeamOrThrow = vi.fn();
vi.mock("@calcom/features/ee/teams/lib/inviteMemberUtils", () => ({
  getTeamOrThrow: (...args: unknown[]) => mockGetTeamOrThrow(...args),
  sendExistingUserTeamInviteEmails: vi.fn().mockResolvedValue(undefined),
  sendSignupToOrganizationEmail: vi.fn().mockResolvedValue(undefined),
}));

const mockAddNewMembersToEventTypes = vi.fn().mockResolvedValue(undefined);
vi.mock("@calcom/features/ee/teams/lib/queries", () => ({
  addNewMembersToEventTypes: (...args: unknown[]) => mockAddNewMembersToEventTypes(...args),
}));

vi.mock("@calcom/features/profile/repositories/ProfileRepository", () => ({
  ProfileRepository: {
    createManyForExistingUsers: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockCreateUsersAndConnectToOrg = vi.fn().mockResolvedValue([]);
vi.mock("./users/createUsersAndConnectToOrg", () => ({
  default: (...args: unknown[]) => mockCreateUsersAndConnectToOrg(...args),
}));

const mockFindManyGroupMapping = vi.fn();
const mockFindManyUser = vi.fn();
const mockCreateManyMembership = vi.fn().mockResolvedValue({ count: 0 });

vi.mock("@calcom/prisma", () => ({
  default: {
    dSyncTeamGroupMapping: {
      findMany: (...args: unknown[]) => mockFindManyGroupMapping(...args),
    },
    user: {
      findMany: (...args: unknown[]) => mockFindManyUser(...args),
    },
    membership: {
      createMany: (...args: unknown[]) => mockCreateManyMembership(...args),
    },
  },
}));

const organizationId = 1001;
const teamId = 2001;
const directoryId = "test-directory-id";
const groupName = "Engineering";

const mockTeam = {
  id: teamId,
  name: "Engineering Team",
  parent: { organizationSettings: null },
  organizationSettings: null,
};

const mockOrg = {
  id: organizationId,
  name: "Test Organization",
  slug: "test-org",
  isOrganization: true,
  parent: null,
  parentId: null,
  metadata: null,
  organizationSettings: { orgAutoAcceptEmail: "" },
};

function createGroupEvent(memberEmails: string[]): DirectorySyncEvent {
  return {
    event: "group.user_added",
    tenant: "test-tenant",
    directory_id: directoryId,
    data: {
      id: "group-123",
      name: groupName,
      raw: {
        members: memberEmails.map((email) => ({
          value: email,
          display: email,
        })),
      },
    },
  } as DirectorySyncEvent;
}

function mockUser(id: number, email: string, orgId: number | null) {
  return {
    id,
    email,
    username: email.split("@")[0],
    organizationId: orgId,
    completedOnboarding: true,
    identityProvider: IdentityProvider.CAL,
    profiles: [],
    locale: "en",
    teams: [],
    password: null,
  };
}

describe("handleGroupEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFindManyGroupMapping.mockResolvedValue([
      { teamId, team: mockTeam, groupName },
    ]);

    mockGetTeamOrThrow.mockResolvedValue(mockOrg);
  });

  describe("Cross-organization membership prevention", () => {
    it("should skip users that belong to a different organization", async () => {
      const crossOrgUser = mockUser(1, "attacker@evil.com", 9999);
      mockFindManyUser.mockResolvedValue([crossOrgUser]);

      const handleGroupEvents = (await import("./handleGroupEvents")).default;
      await handleGroupEvents(createGroupEvent(["attacker@evil.com"]), organizationId);

      expect(mockLog.warn).toHaveBeenCalledWith(
        expect.stringContaining("Skipping user attacker@evil.com")
      );

      // membership.createMany should be called with empty data (no valid users)
      expect(mockCreateManyMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
        })
      );
    });

    it("should provision users that belong to the same organization", async () => {
      const validUser = mockUser(2, "member@company.com", organizationId);
      mockFindManyUser.mockResolvedValue([validUser]);

      const handleGroupEvents = (await import("./handleGroupEvents")).default;
      await handleGroupEvents(createGroupEvent(["member@company.com"]), organizationId);

      expect(mockLog.warn).not.toHaveBeenCalled();

      // membership.createMany should include the valid user
      expect(mockCreateManyMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ userId: 2, teamId }),
            expect.objectContaining({ userId: 2, teamId: organizationId }),
          ]),
        })
      );
    });

    it("should provision users with no organization (organizationId is null)", async () => {
      const freeUser = mockUser(3, "free@example.com", null);
      mockFindManyUser.mockResolvedValue([freeUser]);

      const handleGroupEvents = (await import("./handleGroupEvents")).default;
      await handleGroupEvents(createGroupEvent(["free@example.com"]), organizationId);

      expect(mockLog.warn).not.toHaveBeenCalled();

      expect(mockCreateManyMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ userId: 3, teamId }),
          ]),
        })
      );
    });

    it("should provision valid users and skip cross-org users in mixed group", async () => {
      const validUser = mockUser(4, "valid@company.com", organizationId);
      const crossOrgUser = mockUser(5, "cross@other.com", 8888);
      mockFindManyUser.mockResolvedValue([validUser, crossOrgUser]);

      const handleGroupEvents = (await import("./handleGroupEvents")).default;
      await handleGroupEvents(
        createGroupEvent(["valid@company.com", "cross@other.com"]),
        organizationId
      );

      expect(mockLog.warn).toHaveBeenCalledWith(
        expect.stringContaining("Skipping user cross@other.com")
      );

      // Only the valid user should have memberships created
      expect(mockCreateManyMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ userId: 4, teamId }),
            expect.objectContaining({ userId: 4, teamId: organizationId }),
          ]),
        })
      );

      // Cross-org user should NOT appear in membership data
      const membershipCall = mockCreateManyMembership.mock.calls.find(
        (call: unknown[]) => (call[0] as { skipDuplicates?: boolean }).skipDuplicates === true
      );
      if (membershipCall) {
        const data = (membershipCall[0] as { data: { userId: number }[] }).data;
        const crossOrgUserIds = data.filter((m) => m.userId === 5);
        expect(crossOrgUserIds).toHaveLength(0);
      }
    });

    it("should not attempt to recreate cross-org users as new users", async () => {
      const crossOrgUser = mockUser(6, "existing@other-org.com", 7777);
      mockFindManyUser.mockResolvedValue([crossOrgUser]);

      const handleGroupEvents = (await import("./handleGroupEvents")).default;
      await handleGroupEvents(
        createGroupEvent(["existing@other-org.com"]),
        organizationId
      );

      // User exists in DB → should NOT be in newUserEmails → createUsersAndConnectToOrg not called
      expect(mockCreateUsersAndConnectToOrg).not.toHaveBeenCalled();
    });
  });
});
