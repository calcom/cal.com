import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { Prisma } from "@calcom/prisma/client";
import { CreationSource, MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamWithParent } from "./types";
import type { UserWithMembership } from "./utils";
import {
  canBeInvited,
  checkInputEmailIsValid,
  createMemberships,
  createNewUsersConnectToOrgIfExists,
  ensureAtleastAdminPermissions,
  getAutoJoinStatus,
  getOrgConnectionInfo,
  getOrgState,
  getUniqueInvitationsOrThrowIfEmpty,
  INVITE_STATUS,
} from "./utils";

const {
  mockCreateMany,
  mockUserCreate,
  mockMembershipCreate,
  mockTransaction,
  mockCreateUserInTransaction,
  mockDeriveFromEmail,
} = vi.hoisted(() => {
  const mockCreateManyFn = vi.fn();
  const mockUserCreateFn = vi.fn();
  const mockMembershipCreateFn = vi.fn();
  const mockCreateUserInTransactionFn = vi.fn();
  const mockDeriveFromEmailFn = vi.fn();
  const mockTransactionFn = vi.fn(async (callback: (tx: any) => Promise<unknown>) => {
    return callback({
      user: {
        create: mockUserCreateFn,
      },
      membership: {
        create: mockMembershipCreateFn,
        createMany: mockCreateManyFn,
      },
    });
  });

  return {
    mockCreateMany: mockCreateManyFn,
    mockUserCreate: mockUserCreateFn,
    mockMembershipCreate: mockMembershipCreateFn,
    mockTransaction: mockTransactionFn,
    mockCreateUserInTransaction: mockCreateUserInTransactionFn,
    mockDeriveFromEmail: mockDeriveFromEmailFn,
  };
});

vi.mock("@calcom/prisma", () => {
  return {
    prisma: {
      membership: {
        createMany: mockCreateMany,
      },
      user: {
        create: mockUserCreate,
      },
      $transaction: mockTransaction,
    },
  };
});

vi.mock("@calcom/features/users/di/UserCreationService.container", () => ({
  getUserCreationService: () => ({
    createUserInTransaction: mockCreateUserInTransaction,
  }),
}));

vi.mock("@calcom/features/users/di/UsernameValidationService.container", () => ({
  getUsernameValidationService: () => ({
    deriveFromEmail: mockDeriveFromEmail,
  }),
}));

vi.mock("@calcom/features/pbac/utils/isOrganisationAdmin", () => {
  return {
    isOrganisationAdmin: vi.fn(),
    isOrganisationOwner: vi.fn(),
  };
});

vi.mock("@calcom/features/pbac/services/permission-check.service", () => {
  return {
    PermissionCheckService: vi.fn(),
  };
});

const { mockLogSeatAddition } = vi.hoisted(() => {
  return { mockLogSeatAddition: vi.fn() };
});

vi.mock("@calcom/features/ee/billing/service/seatTracking/SeatChangeTrackingService", () => ({
  SeatChangeTrackingService: class {
    logSeatAddition = mockLogSeatAddition;
  },
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@calcom/lib/logger", () => {
  const mockSubLogger = {
    debug: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    getSubLogger: vi.fn(() => mockSubLogger),
  };
  return {
    default: {
      getSubLogger: vi.fn(() => mockSubLogger),
      error: vi.fn(),
      debug: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    },
  };
});

const mockedRegularTeam: TeamWithParent = {
  id: 1,
  name: "Team A",
  slug: null,
  appLogo: null,
  appIconLogo: null,
  bio: null,
  hideBranding: false,
  pendingPayment: false,
  hideBookATeamMember: false,
  createdAt: new Date(),
  brandColor: "#292929",
  darkBrandColor: "#fafafa",
  timeZone: "Europe/London",
  weekStart: "Sunday",
  theme: null,
  timeFormat: null,
  metadata: null,
  parentId: null,
  parent: null,
  isPrivate: false,
  logoUrl: "",
  isOrganization: false,
  calVideoLogo: "",
  bannerUrl: "",
  isPlatform: false,
  smsLockState: "LOCKED",
  createdByOAuthClientId: null,
  smsLockReviewedByAdmin: false,
  hideTeamProfileLink: false,
  rrResetInterval: null,
  rrTimestampBasis: "CREATED_AT",
  bookingLimits: null,
  includeManagedEventsInLimits: false,
};

const mockedSubTeam = {
  ...mockedRegularTeam,
  parentId: 1000,
};

const mockUser: UserWithMembership = {
  id: 4,
  username: "pro",
  email: "pro@example.com",
  password: {
    hash: "",
    userId: 0,
  },
  completedOnboarding: true,
  identityProvider: "CAL",
  profiles: [],
};

const userInTeamAccepted: UserWithMembership = {
  ...mockUser,
  teams: [{ teamId: mockedRegularTeam.id, accepted: true, userId: mockUser.id, role: "MEMBER" }],
};

const userInTeamNotAccepted: UserWithMembership = {
  ...mockUser,
  teams: [{ teamId: mockedRegularTeam.id, accepted: false, userId: mockUser.id, role: "MEMBER" }],
};

describe("Invite Member Utils", () => {
  describe("ensureAtleastAdminPermissions", () => {
    it("It should throw an error if the user is not an admin of the ORG", async () => {
      const mockCheckPermission = vi.fn().mockResolvedValue(false);
      vi.mocked(PermissionCheckService).mockImplementation(function () {
        return {
          checkPermission: mockCheckPermission,
        } as any;
      });

      await expect(ensureAtleastAdminPermissions({ userId: 1, teamId: 1, isOrg: true })).rejects.toThrow(
        "UNAUTHORIZED"
      );

      expect(mockCheckPermission).toHaveBeenCalledWith({
        userId: 1,
        teamId: 1,
        permission: "organization.invite",
        fallbackRoles: ["OWNER", "ADMIN"],
      });
    });

    it("It should NOT throw an error if the user is an admin of the ORG", async () => {
      const mockCheckPermission = vi.fn().mockResolvedValue(true);
      vi.mocked(PermissionCheckService).mockImplementation(function () {
        return {
          checkPermission: mockCheckPermission,
        } as any;
      });

      await expect(
        ensureAtleastAdminPermissions({ userId: 1, teamId: 1, isOrg: true })
      ).resolves.not.toThrow();

      expect(mockCheckPermission).toHaveBeenCalledWith({
        userId: 1,
        teamId: 1,
        permission: "organization.invite",
        fallbackRoles: ["OWNER", "ADMIN"],
      });
    });
  });

  describe("getUniqueInvitationsOrThrowIfEmpty", () => {
    it("should throw a TRPCError with code BAD_REQUEST if no emails are provided", async () => {
      await expect(getUniqueInvitationsOrThrowIfEmpty([])).rejects.toThrow(TRPCError);
    });

    it("should return an array with multiple emails if an array is provided", async () => {
      const result = await getUniqueInvitationsOrThrowIfEmpty([
        { usernameOrEmail: "test1@example.com", role: MembershipRole.MEMBER },
        { usernameOrEmail: "test2@example.com", role: MembershipRole.MEMBER },
      ]);
      expect(result).toEqual([
        { usernameOrEmail: "test1@example.com", role: MembershipRole.MEMBER },
        { usernameOrEmail: "test2@example.com", role: MembershipRole.MEMBER },
      ]);
    });
  });
  describe("checkInputEmailIsValid", () => {
    it("should throw a TRPCError with code BAD_REQUEST if the email is invalid", () => {
      const invalidEmail = "invalid-email";
      expect(() => checkInputEmailIsValid(invalidEmail)).toThrow(TRPCError);
      expect(() => checkInputEmailIsValid(invalidEmail)).toThrowError(
        "Invite failed because invalid-email is not a valid email address"
      );
    });

    it("should not throw an error if the email is valid", () => {
      const validEmail = "valid-email@example.com";
      const validEmailWithApostrophe = "valid'email@example.com";
      expect(() => checkInputEmailIsValid(validEmail)).not.toThrow();
      expect(() => checkInputEmailIsValid(validEmailWithApostrophe)).not.toThrow();
    });
  });
  describe("getOrgConnectionInfo", () => {
    const orgAutoAcceptDomain = "example.com";
    const email = "user@example.com";

    it("should return autoAccept:false when orgVerified is false even if email domain matches orgAutoAcceptDomain", () => {
      const result = getOrgConnectionInfo({
        orgAutoAcceptDomain,
        orgVerified: false,
        email,
        team: {
          ...mockedRegularTeam,
          parentId: 2,
        },
        isOrg: false,
      });
      expect(result).toEqual({ orgId: 2, autoAccept: false });
    });

    it("should return orgId and autoAccept as false if team has parent and email domain does not match orgAutoAcceptDomain", () => {
      const result = getOrgConnectionInfo({
        orgAutoAcceptDomain,
        orgVerified: true,
        email: "user@other.com",
        team: {
          ...mockedRegularTeam,
          parentId: 2,
        },
        isOrg: false,
      });
      expect(result).toEqual({ orgId: undefined, autoAccept: false });
    });

    it("should return orgId and autoAccept as true if team has no parent and isOrg is true and email domain matches orgAutoAcceptDomain", () => {
      const result = getOrgConnectionInfo({
        orgAutoAcceptDomain,
        orgVerified: true,
        email,
        team: { ...mockedRegularTeam, parentId: null },
        isOrg: true,
      });
      expect(result).toEqual({ orgId: 1, autoAccept: true });
    });

    it("should return orgId and autoAccept as false if team has no parent and isOrg is true and email domain does not match orgAutoAcceptDomain", () => {
      const result = getOrgConnectionInfo({
        orgAutoAcceptDomain,
        orgVerified: false,
        email: "user@other.com",
        team: { ...mockedRegularTeam, parentId: null },
        isOrg: true,
      });
      expect(result).toEqual({ orgId: undefined, autoAccept: false });
    });

    it("should return orgId and autoAccept as false if team has no parent and isOrg is true and email domain matches orgAutoAcceptDomain but orgVerified is false", () => {
      const result = getOrgConnectionInfo({
        orgAutoAcceptDomain,
        orgVerified: false,
        email,
        team: { ...mockedRegularTeam, parentId: null },
        isOrg: true,
      });
      expect(result).toEqual({ orgId: mockedRegularTeam.id, autoAccept: false });
    });
  });
  describe("getOrgState", () => {
    it("should return the correct values when isOrg is true and teamMetadata.orgAutoAcceptEmail is true", () => {
      const team = {
        organizationSettings: {
          id: 1,
          teamId: 1,
          isOrganizationConfigured: false,
          isOrganizationVerified: true,
          orgAutoAcceptEmail: "example.com",
          organizationId: 1,
          lockEventTypeCreationForUsers: false,
          adminGetsNoSlotsNotification: false,
          isAdminReviewed: false,
          isAdminAPIEnabled: false,
          allowSEOIndexing: false,
          orgProfileRedirectsToVerifiedDomain: false,
          disablePhoneOnlySMSNotifications: false,
        },
        slug: "abc",
        parent: null,
        isOrganization: true,
      };
      const result = getOrgState(true, { ...mockedRegularTeam, ...team });
      expect(result).toEqual({
        isInOrgScope: true,
        orgVerified: true,
        orgConfigured: false,
        orgPublished: true,
        autoAcceptEmailDomain: "example.com",
      });
    });

    it("should return the correct values when orgMetadataIfExists.orgAutoAcceptEmail is true", () => {
      const team = {
        metadata: {},
        parent: {
          ...mockedRegularTeam,
          organizationSettings: {
            id: 1,
            teamId: 1,
            isOrganizationConfigured: false,
            isOrganizationVerified: false,
            orgAutoAcceptEmail: "example.com",
            organizationId: 1,
            lockEventTypeCreationForUsers: false,
            adminGetsNoSlotsNotification: false,
            isAdminReviewed: false,
            isAdminAPIEnabled: false,
            allowSEOIndexing: false,
            orgProfileRedirectsToVerifiedDomain: false,
            disablePhoneOnlySMSNotifications: false,
          },
        },
      };
      const result = getOrgState(false, { ...mockedRegularTeam, ...team });
      expect(result).toEqual({
        isInOrgScope: true,
        orgVerified: false,
        orgConfigured: false,
        orgPublished: false,
        autoAcceptEmailDomain: "example.com",
      });
    });

    it("should return the correct values when neither isOrg nor orgMetadataIfExists.orgAutoAcceptEmail is true", () => {
      const team = {
        metadata: {},
        parent: null,
      };
      const result = getOrgState(false, { ...mockedRegularTeam, ...team });
      expect(result).toEqual({
        isInOrgScope: false,
        orgVerified: null,
        orgConfigured: null,
        orgPublished: null,
        autoAcceptEmailDomain: null,
      });
    });
  });

  describe("canBeInvited: Check if user can be invited to the team/org", () => {
    const invitee: UserWithMembership = {
      ...mockUser,
      id: 1,
      username: "testuser",
      email: "testuser@example.com",
      profiles: [],
    };

    it("should return CAN_BE_INVITED when inviting to an sub-team if the invitee is a member of the organization", () => {
      const inviteeOrganizationId = 2;
      const inviteeWithOrg: UserWithMembership = {
        ...invitee,
        profiles: [getSampleProfile({ organizationId: inviteeOrganizationId })],
      };

      const subTeam = {
        ...mockedRegularTeam,
        parentId: inviteeOrganizationId,
      };

      expect(canBeInvited(inviteeWithOrg, subTeam)).toBe(INVITE_STATUS.CAN_BE_INVITED);
    });

    it("should return CAN_BE_INVITED if the user is invited to a sub-team of the organization the user belongs to", () => {
      const inviteeOrgId = 2;
      const subTeamOrgId = inviteeOrgId;
      const inviteeWithOrg: UserWithMembership = {
        ...invitee,
        profiles: [getSampleProfile({ organizationId: 2 })],
        teams: [{ teamId: 2, accepted: true, userId: invitee.id, role: "ADMIN" }],
      };

      const subTeam = {
        ...mockedRegularTeam,
        parentId: subTeamOrgId,
        id: 1,
      };
      expect(canBeInvited(inviteeWithOrg, subTeam)).toBe(INVITE_STATUS.CAN_BE_INVITED);
    });

    it("should return CAN_BE_INVITED if the invitee does not already belong to another organization and is being invited to a regular team", () => {
      expect(canBeInvited(invitee, mockedRegularTeam)).toBe(INVITE_STATUS.CAN_BE_INVITED);
    });

    it("should return USER_ALREADY_INVITED_OR_MEMBER when inviting a user who is already a member of the team", () => {
      const teamId = 1;
      const inviteeWithOrg: UserWithMembership = {
        ...invitee,
        teams: [{ teamId: teamId, accepted: true, userId: invitee.id, role: "ADMIN" }],
      };
      const regularTeam = {
        ...mockedRegularTeam,
        id: teamId,
      };
      expect(canBeInvited(inviteeWithOrg, regularTeam)).toBe(INVITE_STATUS.USER_ALREADY_INVITED_OR_MEMBER);
    });

    it("should return USER_ALREADY_INVITED_OR_MEMBER when inviting a user to sub-team who is already a member of the sub-team", () => {
      const teamId = 1;
      const inviteeOrgId = 2;
      const inviteeWithOrg: UserWithMembership = {
        ...invitee,
        profiles: [getSampleProfile({ organizationId: inviteeOrgId })],
        teams: [
          { teamId: teamId, accepted: true, userId: invitee.id, role: "ADMIN" },
          { teamId: inviteeOrgId, accepted: true, userId: invitee.id, role: "ADMIN" },
        ],
      };
      const subTeam = {
        ...mockedRegularTeam,
        parentId: inviteeOrgId,
        id: teamId,
      };
      expect(canBeInvited(inviteeWithOrg, subTeam)).toBe(INVITE_STATUS.USER_ALREADY_INVITED_OR_MEMBER);
    });

    it("should return USER_ALREADY_INVITED_OR_MEMBER when inviting a user to an organization who is already a member of the organization", () => {
      const inviteeOrgId = 2;
      const inviteeWithOrg: UserWithMembership = {
        ...invitee,
        profiles: [getSampleProfile({ organizationId: inviteeOrgId })],
        teams: [{ teamId: inviteeOrgId, accepted: true, userId: invitee.id, role: "ADMIN" }],
      };
      const organization = {
        ...mockedRegularTeam,
        parentId: null,
        id: inviteeOrgId,
        isOrganization: true,
      };
      expect(canBeInvited(inviteeWithOrg, organization)).toBe(INVITE_STATUS.USER_ALREADY_INVITED_OR_MEMBER);
    });

    it("should return USER_PENDING_MEMBER_OF_THE_ORG if the invitee is being invited to a team in an organization but he has not accepted the organization membership", () => {
      const inviteeOrganizationId = 2;
      const inviteeWithOrg: UserWithMembership = {
        ...invitee,
        teams: [{ teamId: inviteeOrganizationId, accepted: false, userId: invitee.id, role: "ADMIN" }],
      };

      const subTeam = {
        ...mockedRegularTeam,
        parentId: inviteeOrganizationId,
        id: 1,
      };
      expect(canBeInvited(inviteeWithOrg, subTeam)).toBe(INVITE_STATUS.USER_PENDING_MEMBER_OF_THE_ORG);
    });

    it("should return USER_MEMBER_OF_OTHER_ORGANIZATION if the invitee is being invited to an organization but he belongs to another organization", () => {
      const inviteeOrganizationId = 2;
      const organizationIdBeingInvitedTo = 3;
      const inviteeWithOrg: UserWithMembership = {
        ...invitee,
        profiles: [
          getSampleProfile({
            organizationId: inviteeOrganizationId,
          }),
        ],
        teams: [{ teamId: inviteeOrganizationId, accepted: true, userId: invitee.id, role: "ADMIN" }],
      };

      const organization = {
        ...mockedRegularTeam,
        id: organizationIdBeingInvitedTo,
        isOrganization: true,
      };
      expect(canBeInvited(inviteeWithOrg, organization)).toBe(
        INVITE_STATUS.USER_MEMBER_OF_OTHER_ORGANIZATION
      );
    });

    it("should return CAN_BE_INVITED if the user being invited has a profile with the organization already", () => {
      const organizationId = 3;
      const inviteeWithOrg: UserWithMembership = {
        ...invitee,
        profiles: [
          getSampleProfile({
            organizationId: organizationId,
          }),
        ],
        teams: [],
      };

      const organization = {
        ...mockedRegularTeam,
        id: organizationId,
        isOrganization: true,
      };
      expect(canBeInvited(inviteeWithOrg, organization)).toBe(INVITE_STATUS.CAN_BE_INVITED);
    });

    it("should return USER_MEMBER_OF_OTHER_ORGANIZATION if the invitee is being invited to a sub-team in an organization but he belongs to another organization", () => {
      const inviteeOrganizationId = 2;
      const subTeamOrganizationId = 3;
      const inviteeWithOrg: UserWithMembership = {
        ...invitee,
        profiles: [
          getSampleProfile({
            organizationId: inviteeOrganizationId,
          }),
        ],
        teams: [{ teamId: inviteeOrganizationId, accepted: true, userId: invitee.id, role: "ADMIN" }],
      };

      const teamWithOrg = {
        ...mockedRegularTeam,
        parentId: subTeamOrganizationId,
        id: 1,
      };
      expect(canBeInvited(inviteeWithOrg, teamWithOrg)).toBe(INVITE_STATUS.USER_MEMBER_OF_OTHER_ORGANIZATION);
    });

    it("should return 'USER_MEMBER_OF_OTHER_ORGANIZATION' when the invitee is invited to a regular team but the he is a part of an organization", () => {
      const inviteeOrganizationId = 2;
      const inviteeWithOrg: UserWithMembership = {
        ...invitee,
        profiles: [getSampleProfile({ organizationId: inviteeOrganizationId })],
        teams: [{ teamId: inviteeOrganizationId, accepted: true, userId: invitee.id, role: "ADMIN" }],
      };

      const regularTeam = { ...mockedRegularTeam };

      expect(canBeInvited(inviteeWithOrg, regularTeam)).toBe(INVITE_STATUS.USER_MEMBER_OF_OTHER_ORGANIZATION);
    });
  });

  describe("shouldAutoJoinIfInOrg", () => {
    it("should return autoAccept: false if the team is a sub-team but not in the user's organization", async () => {
      const result = getAutoJoinStatus({
        team: mockedSubTeam,
        invitee: userInTeamAccepted,
        connectionInfoMap: {
          [userInTeamAccepted.email]: {
            orgId: mockedRegularTeam.id,
            autoAccept: false,
          },
        },
      });
      expect(result).toEqual({
        autoAccept: false,
        needToCreateOrgMembership: true,
        needToCreateProfile: false,
      });
    });

    it("should return autoAccept: true in case email is auto-acceptable even if the team is a sub-team but not in the user's organization ", async () => {
      const result = getAutoJoinStatus({
        team: mockedSubTeam,
        invitee: userInTeamAccepted,
        connectionInfoMap: {
          [userInTeamAccepted.email]: {
            orgId: mockedRegularTeam.id,
            autoAccept: true,
          },
        },
      });
      expect(result).toEqual({
        autoAccept: true,
        needToCreateOrgMembership: true,
        needToCreateProfile: true,
      });
    });

    it("should return autoAccept: false if the team is neither a sub-team, nor an organization. It is a regular team ", async () => {
      const result = getAutoJoinStatus({
        team: {
          ...mockedRegularTeam,
          parentId: null,
        },
        invitee: userInTeamAccepted,
        connectionInfoMap: {
          [userInTeamAccepted.email]: {
            orgId: mockedRegularTeam.id,
            autoAccept: false,
          },
        },
      });
      expect(result).toEqual({
        autoAccept: false,
        needToCreateOrgMembership: null,
        needToCreateProfile: null,
      });
    });

    it("should return `autoAccept: false` if team has parent organization and invitee has not accepted membership to organization - even if email is autoAcceptable", async () => {
      const result = getAutoJoinStatus({
        team: { ...mockedRegularTeam, parentId: mockedRegularTeam.id },
        invitee: {
          ...userInTeamNotAccepted,
          profiles: [getSampleProfile({ organizationId: mockedRegularTeam.id })],
        },
        connectionInfoMap: {
          [userInTeamAccepted.email]: {
            orgId: mockedRegularTeam.id,
            autoAccept: true,
          },
        },
      });
      expect(result).toEqual({
        autoAccept: false,
        needToCreateOrgMembership: false,
        needToCreateProfile: false,
      });
    });

    it("should return `autoAccept: true` if team has parent organization and invitee has accepted membership to organization", async () => {
      const result = getAutoJoinStatus({
        team: { ...mockedRegularTeam, parentId: mockedRegularTeam.id },
        invitee: {
          ...userInTeamAccepted,
          profiles: [getSampleProfile()],
        },
        connectionInfoMap: {
          [userInTeamAccepted.email]: {
            orgId: mockedRegularTeam.id,
            autoAccept: false,
          },
        },
      });
      expect(result).toEqual({
        autoAccept: true,
        needToCreateOrgMembership: false,
        needToCreateProfile: false,
      });
    });
  });

  describe("createNewUsersConnectToOrgIfExists", () => {
    beforeEach(() => {
      mockUserCreate.mockReset();
      mockMembershipCreate.mockReset();
      mockTransaction.mockClear();
      mockLogSeatAddition.mockClear();
      mockCreateUserInTransaction.mockReset();
      mockDeriveFromEmail.mockReset();
    });

    it("logs seat changes for new users on regular teams", async () => {
      let nextId = 100;
      mockCreateUserInTransaction.mockImplementation(
        async (_tx: unknown, { data }: { data: { email: string } }) => ({
          id: nextId++,
          email: data.email,
        })
      );
      mockMembershipCreate.mockResolvedValue({});

      const invitations = [
        { usernameOrEmail: "new1@example.com", role: MembershipRole.MEMBER },
        { usernameOrEmail: "new2@example.com", role: MembershipRole.MEMBER },
      ];
      const orgConnectInfoByUsernameOrEmail = {
        "new1@example.com": { orgId: undefined, autoAccept: false },
        "new2@example.com": { orgId: undefined, autoAccept: false },
      };

      const result = await createNewUsersConnectToOrgIfExists({
        invitations,
        isOrg: false,
        teamId: mockedRegularTeam.id,
        parentId: null,
        autoAcceptEmailDomain: null,
        orgConnectInfoByUsernameOrEmail,
        language: "en",
        creationSource: CreationSource.WEBAPP,
      });

      expect(result).toHaveLength(2);
      expect(mockLogSeatAddition).toHaveBeenCalledWith({
        teamId: mockedRegularTeam.id,
        seatCount: 2,
      });
    });

    it("passes null username for non-org team invites (no parentId, not isOrg)", async () => {
      let nextId = 100;
      mockCreateUserInTransaction.mockImplementation(
        async (_tx: unknown, { data }: { data: { email: string } }) => ({
          id: nextId++,
          email: data.email,
        })
      );
      mockMembershipCreate.mockResolvedValue({});

      await createNewUsersConnectToOrgIfExists({
        invitations: [{ usernameOrEmail: "alice@test.com", role: MembershipRole.MEMBER }],
        isOrg: false,
        teamId: mockedRegularTeam.id,
        parentId: null,
        autoAcceptEmailDomain: null,
        orgConnectInfoByUsernameOrEmail: {
          "alice@test.com": { orgId: undefined, autoAccept: false },
        },
        language: "en",
        creationSource: CreationSource.WEBAPP,
      });

      expect(mockCreateUserInTransaction).toHaveBeenCalledTimes(1);
      const createData = mockCreateUserInTransaction.mock.calls[0][1].data;
      expect(createData.username).toBeNull();
      expect(mockDeriveFromEmail).not.toHaveBeenCalled();
    });

    it("passes null username for multiple non-org team invites so they do not collide", async () => {
      let nextId = 100;
      mockCreateUserInTransaction.mockImplementation(
        async (_tx: unknown, { data }: { data: { email: string } }) => ({
          id: nextId++,
          email: data.email,
        })
      );
      mockMembershipCreate.mockResolvedValue({});

      await createNewUsersConnectToOrgIfExists({
        invitations: [
          { usernameOrEmail: "user1@test.com", role: MembershipRole.MEMBER },
          { usernameOrEmail: "user2@test.com", role: MembershipRole.MEMBER },
          { usernameOrEmail: "user3@test.com", role: MembershipRole.MEMBER },
        ],
        isOrg: false,
        teamId: mockedRegularTeam.id,
        parentId: null,
        autoAcceptEmailDomain: null,
        orgConnectInfoByUsernameOrEmail: {
          "user1@test.com": { orgId: undefined, autoAccept: false },
          "user2@test.com": { orgId: undefined, autoAccept: false },
          "user3@test.com": { orgId: undefined, autoAccept: false },
        },
        language: "en",
        creationSource: CreationSource.WEBAPP,
      });

      expect(mockCreateUserInTransaction).toHaveBeenCalledTimes(3);
      for (let i = 0; i < 3; i++) {
        expect(mockCreateUserInTransaction.mock.calls[i][1].data.username).toBeNull();
      }
      expect(mockDeriveFromEmail).not.toHaveBeenCalled();
    });

    it("derives username from email for org invites (isOrg=true)", async () => {
      mockDeriveFromEmail.mockReturnValue("alice-test");
      let nextId = 100;
      mockCreateUserInTransaction.mockImplementation(
        async (_tx: unknown, { data }: { data: { email: string } }) => ({
          id: nextId++,
          email: data.email,
        })
      );
      mockMembershipCreate.mockResolvedValue({});

      await createNewUsersConnectToOrgIfExists({
        invitations: [{ usernameOrEmail: "alice@test.com", role: MembershipRole.MEMBER }],
        isOrg: true,
        teamId: 1,
        parentId: null,
        autoAcceptEmailDomain: "test.com",
        orgConnectInfoByUsernameOrEmail: {
          "alice@test.com": { orgId: 1, autoAccept: true },
        },
        language: "en",
        creationSource: CreationSource.WEBAPP,
      });

      expect(mockDeriveFromEmail).toHaveBeenCalledWith("alice@test.com", "test.com", {
        isPlatformManaged: undefined,
      });
      expect(mockCreateUserInTransaction).toHaveBeenCalledTimes(1);
      expect(mockCreateUserInTransaction.mock.calls[0][1].data.username).toBe("alice-test");
    });

    it("derives username from email for sub-team invites (parentId set)", async () => {
      mockDeriveFromEmail.mockReturnValue("bob-example");
      let nextId = 100;
      mockCreateUserInTransaction.mockImplementation(
        async (_tx: unknown, { data }: { data: { email: string } }) => ({
          id: nextId++,
          email: data.email,
        })
      );
      mockMembershipCreate.mockResolvedValue({});

      const parentOrgId = 1000;
      await createNewUsersConnectToOrgIfExists({
        invitations: [{ usernameOrEmail: "bob@example.com", role: MembershipRole.MEMBER }],
        isOrg: false,
        teamId: mockedRegularTeam.id,
        parentId: parentOrgId,
        autoAcceptEmailDomain: "example.com",
        orgConnectInfoByUsernameOrEmail: {
          "bob@example.com": { orgId: parentOrgId, autoAccept: true },
        },
        language: "en",
        creationSource: CreationSource.WEBAPP,
      });

      expect(mockDeriveFromEmail).toHaveBeenCalledWith("bob@example.com", "example.com", {
        isPlatformManaged: undefined,
      });
      expect(mockCreateUserInTransaction).toHaveBeenCalledTimes(1);
      expect(mockCreateUserInTransaction.mock.calls[0][1].data.username).toBe("bob-example");
    });

    it("throws human-readable error when user creation hits P2002 unique constraint", async () => {
      const p2002Error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.0.0",
      });
      mockTransaction.mockRejectedValueOnce(p2002Error);

      await expect(
        createNewUsersConnectToOrgIfExists({
          invitations: [{ usernameOrEmail: "dup@test.com", role: MembershipRole.MEMBER }],
          isOrg: false,
          teamId: mockedRegularTeam.id,
          parentId: null,
          autoAcceptEmailDomain: null,
          orgConnectInfoByUsernameOrEmail: {
            "dup@test.com": { orgId: undefined, autoAccept: false },
          },
          language: "en",
          creationSource: CreationSource.WEBAPP,
        })
      ).rejects.toThrow("user_already_invited_or_member");
    });

    it("re-throws non-P2002 errors as-is", async () => {
      const genericError = new Error("Some other database error");
      mockTransaction.mockRejectedValueOnce(genericError);

      await expect(
        createNewUsersConnectToOrgIfExists({
          invitations: [{ usernameOrEmail: "fail@test.com", role: MembershipRole.MEMBER }],
          isOrg: false,
          teamId: mockedRegularTeam.id,
          parentId: null,
          autoAcceptEmailDomain: null,
          orgConnectInfoByUsernameOrEmail: {
            "fail@test.com": { orgId: undefined, autoAccept: false },
          },
          language: "en",
          creationSource: CreationSource.WEBAPP,
        })
      ).rejects.toThrow("Some other database error");
    });

    it("creates parent org membership when parentId is set", async () => {
      mockDeriveFromEmail.mockReturnValue("carol-org");
      let nextId = 100;
      mockCreateUserInTransaction.mockImplementation(
        async (_tx: unknown, { data }: { data: { email: string } }) => ({
          id: nextId++,
          email: data.email,
        })
      );
      mockMembershipCreate.mockResolvedValue({});

      const parentOrgId = 2000;
      await createNewUsersConnectToOrgIfExists({
        invitations: [{ usernameOrEmail: "carol@org.com", role: MembershipRole.ADMIN }],
        isOrg: false,
        teamId: mockedRegularTeam.id,
        parentId: parentOrgId,
        autoAcceptEmailDomain: "org.com",
        orgConnectInfoByUsernameOrEmail: {
          "carol@org.com": { orgId: parentOrgId, autoAccept: true },
        },
        language: "en",
        creationSource: CreationSource.WEBAPP,
      });

      // First membership.create: team membership
      expect(mockMembershipCreate).toHaveBeenCalledTimes(2);
      expect(mockMembershipCreate.mock.calls[0][0].data.teamId).toBe(mockedRegularTeam.id);
      expect(mockMembershipCreate.mock.calls[0][0].data.role).toBe(MembershipRole.ADMIN);

      // Second membership.create: parent org membership
      expect(mockMembershipCreate.mock.calls[1][0].data.teamId).toBe(parentOrgId);
      expect(mockMembershipCreate.mock.calls[1][0].data.role).toBe(MembershipRole.MEMBER);
    });

    it("does not create parent org membership when parentId is null", async () => {
      let nextId = 100;
      mockCreateUserInTransaction.mockImplementation(
        async (_tx: unknown, { data }: { data: { email: string } }) => ({
          id: nextId++,
          email: data.email,
        })
      );
      mockMembershipCreate.mockResolvedValue({});

      await createNewUsersConnectToOrgIfExists({
        invitations: [{ usernameOrEmail: "dave@test.com", role: MembershipRole.MEMBER }],
        isOrg: false,
        teamId: mockedRegularTeam.id,
        parentId: null,
        autoAcceptEmailDomain: null,
        orgConnectInfoByUsernameOrEmail: {
          "dave@test.com": { orgId: undefined, autoAccept: false },
        },
        language: "en",
        creationSource: CreationSource.WEBAPP,
      });

      // Only one membership.create call (team membership only, no parent org)
      expect(mockMembershipCreate).toHaveBeenCalledTimes(1);
      expect(mockMembershipCreate.mock.calls[0][0].data.teamId).toBe(mockedRegularTeam.id);
    });
  });

  describe("createMemberships - Privilege Escalation Prevention", () => {
    beforeEach(() => {
      mockCreateMany.mockClear();
      mockCreateMany.mockResolvedValue({ count: 1 });
    });

    it("should NOT escalate privilege when attacker has OWNER role in unrelated team", async () => {
      const attackerTeamId = 999; // Attacker's personal team
      const victimTeamId = 100; // Victim team being invited to
      const victimOrgId = 200; // Parent organization of victim team

      const attacker: UserWithMembership & {
        newRole: MembershipRole;
        needToCreateOrgMembership: boolean | null;
      } = {
        ...mockUser,
        id: 1,
        email: "attacker@example.com",
        username: "attacker",
        teams: [
          // Attacker controls this - OWNER role in their personal team (first in array)
          { teamId: attackerTeamId, userId: 1, accepted: true, role: MembershipRole.OWNER },
          // Some other unrelated membership
          { teamId: 50, userId: 1, accepted: true, role: MembershipRole.MEMBER },
        ],
        newRole: MembershipRole.MEMBER, // Inviter wants to invite as MEMBER
        needToCreateOrgMembership: true,
      };

      await createMemberships({
        teamId: victimTeamId,
        language: "en",
        invitees: [attacker],
        parentId: victimOrgId,
        accepted: false,
      });

      // createMany is called twice: once for team memberships, once for org memberships
      expect(mockCreateMany).toHaveBeenCalledTimes(2);

      // First call: team memberships
      const teamCallArgs = mockCreateMany.mock.calls[0][0];
      const teamMemberships = teamCallArgs.data;
      expect(teamMemberships).toHaveLength(1);

      const teamMembership = teamMemberships[0];
      expect(teamMembership.teamId).toBe(victimTeamId);
      expect(teamMembership.role).toBe(MembershipRole.MEMBER);
      expect(teamMembership.userId).toBe(attacker.id);
      expect(teamMembership.accepted).toBe(false);

      // Second call: org memberships
      const orgCallArgs = mockCreateMany.mock.calls[1][0];
      const orgMemberships = orgCallArgs.data;
      expect(orgMemberships).toHaveLength(1);

      const orgMembership = orgMemberships[0];
      expect(orgMembership.teamId).toBe(victimOrgId);
      expect(orgMembership.role).toBe(MembershipRole.MEMBER);
    });

    it("should preserve ADMIN role when user is already ADMIN in parent organization", async () => {
      const teamId = 100;
      const parentOrgId = 200;

      const existingAdmin: UserWithMembership & {
        newRole: MembershipRole;
        needToCreateOrgMembership: boolean | null;
      } = {
        ...mockUser,
        id: 2,
        email: "admin@example.com",
        username: "admin",
        teams: [
          // User is already ADMIN in the parent org
          { teamId: parentOrgId, userId: 2, accepted: true, role: MembershipRole.ADMIN },
        ],
        newRole: MembershipRole.MEMBER, // Inviter wants MEMBER, but should preserve ADMIN
        needToCreateOrgMembership: false, // Already has org membership
      };

      await createMemberships({
        teamId,
        language: "en",
        invitees: [existingAdmin],
        parentId: parentOrgId,
        accepted: true,
      });

      // First call: team memberships
      const teamCallArgs = mockCreateMany.mock.calls[0][0];
      const teamMemberships = teamCallArgs.data;

      expect(teamMemberships).toHaveLength(1);

      // Should preserve ADMIN role since user is ADMIN in parent org
      expect(teamMemberships[0].teamId).toBe(teamId);
      expect(teamMemberships[0].role).toBe(MembershipRole.ADMIN);

      // No org memberships needed (needToCreateOrgMembership: false)
      // createMany called once for team, no second call for org since no org data
      expect(mockCreateMany).toHaveBeenCalledTimes(1);
    });

    it("should use inviter's role when user has no membership in parent organization", async () => {
      const teamId = 100;
      const parentOrgId = 200;
      const unrelatedTeamId = 999;

      const user: UserWithMembership & {
        newRole: MembershipRole;
        needToCreateOrgMembership: boolean | null;
      } = {
        ...mockUser,
        id: 3,
        email: "user@example.com",
        username: "user",
        teams: [
          // User has OWNER in unrelated team, but NOT in parent org
          { teamId: unrelatedTeamId, userId: 3, accepted: true, role: MembershipRole.OWNER },
        ],
        newRole: MembershipRole.MEMBER,
        needToCreateOrgMembership: true,
      };

      await createMemberships({
        teamId,
        language: "en",
        invitees: [user],
        parentId: parentOrgId,
        accepted: false,
      });

      // First call: team memberships
      const teamCallArgs = mockCreateMany.mock.calls[0][0];
      const teamMemberships = teamCallArgs.data;

      // Should use inviter's chosen role (MEMBER), not OWNER from unrelated team
      expect(teamMemberships[0].role).toBe(MembershipRole.MEMBER);
    });

    it("should use inviter's role when inviting to team without parent organization", async () => {
      const teamId = 100;

      const user: UserWithMembership & {
        newRole: MembershipRole;
        needToCreateOrgMembership: boolean | null;
      } = {
        ...mockUser,
        id: 4,
        email: "user2@example.com",
        username: "user2",
        teams: [
          // User has OWNER in unrelated team
          { teamId: 999, userId: 4, accepted: true, role: MembershipRole.OWNER },
        ],
        newRole: MembershipRole.MEMBER,
        needToCreateOrgMembership: null,
      };

      await createMemberships({
        teamId,
        language: "en",
        invitees: [user],
        parentId: null, // No parent org
        accepted: false,
      });

      // Only one createMany call (no org memberships when parentId is null)
      expect(mockCreateMany).toHaveBeenCalledTimes(1);

      const teamCallArgs = mockCreateMany.mock.calls[0][0];
      const teamMemberships = teamCallArgs.data;

      expect(teamMemberships).toHaveLength(1);
      // Should use inviter's chosen role when no parentId
      expect(teamMemberships[0].role).toBe(MembershipRole.MEMBER);
    });
  });
});
function getSampleProfile({ organizationId }: { organizationId?: number } = {}): {
  id: number;
  uid: string;
  userId: number;
  organizationId: number;
  username: string;
  createdAt: Date;
  updatedAt: Date;
  movedFromUserId: number | null;
} {
  return {
    id: 1,
    uid: "1",
    userId: 1,
    organizationId: organizationId ?? 1,
    username: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    movedFromUserId: null,
  };
}
