import { describe, it, vi, expect } from "vitest";

import { isTeamAdmin } from "@calcom/lib/server/queries";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TeamWithParent } from "./types";
import type { UserWithMembership } from "./utils";
import { INVITE_STATUS } from "./utils";
import {
  ensureAtleastAdminPermissions,
  getUniqueInvitationsOrThrowIfEmpty,
  getOrgState,
  getOrgConnectionInfo,
  canBeInvited,
  getAutoJoinStatus,
  checkInputEmailIsValid,
} from "./utils";

vi.mock("@calcom/lib/server/queries", () => {
  return {
    isTeamAdmin: vi.fn(),
  };
});

vi.mock("@calcom/lib/server/queries/organisations", () => {
  return {
    isOrganisationAdmin: vi.fn(),
    isOrganisationOwner: vi.fn(),
  };
});

const mockedReturnSuccessCheckPerms = {
  accepted: true,
  disableImpersonation: false,
  id: 1,
  role: MembershipRole.ADMIN,
  userId: 1,
  teamId: 1,
  team: {
    id: 1,
    name: "Team A",
    slug: null,
    logo: null,
    appLogo: null,
    appIconLogo: null,
    bio: null,
    hideBranding: false,
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
    calVideoLogo: "",
  },
};

const mockedRegularTeam: TeamWithParent = {
  id: 1,
  name: "Team A",
  slug: null,
  logo: null,
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
      vi.mocked(isOrganisationAdmin).mockResolvedValue(false);
      await expect(ensureAtleastAdminPermissions({ userId: 1, teamId: 1, isOrg: true })).rejects.toThrow(
        "UNAUTHORIZED"
      );
    });

    it("It should NOT throw an error if the user is an admin of the ORG", async () => {
      vi.mocked(isOrganisationAdmin).mockResolvedValue(mockedReturnSuccessCheckPerms);
      await expect(
        ensureAtleastAdminPermissions({ userId: 1, teamId: 1, isOrg: true })
      ).resolves.not.toThrow();
    });

    it("It should throw an error if the user is not an admin of the team", async () => {
      vi.mocked(isTeamAdmin).mockResolvedValue(false);
      await expect(ensureAtleastAdminPermissions({ userId: 1, teamId: 1 })).rejects.toThrow("UNAUTHORIZED");
    });

    it("It should NOT throw an error if the user is an admin of a team", async () => {
      vi.mocked(isTeamAdmin).mockResolvedValue(mockedReturnSuccessCheckPerms);
      await expect(ensureAtleastAdminPermissions({ userId: 1, teamId: 1 })).resolves.not.toThrow();
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
      expect(() => checkInputEmailIsValid(validEmail)).not.toThrow();
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
        },
        slug: "abc",
        parent: null,
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
      };
      expect(canBeInvited(inviteeWithOrg, organization)).toBe(
        INVITE_STATUS.USER_MEMBER_OF_OTHER_ORGANIZATION
      );
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
