import { describe, it, vi, expect } from "vitest";

import { isTeamAdmin } from "@calcom/lib/server/queries";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TeamWithParent } from "./types";
import type { UserWithMembership } from "./utils";
import {
  checkPermissions,
  getUsernameOrEmailsToInvite,
  getIsOrgVerified,
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
  describe("checkPermissions", () => {
    it("It should throw an error if the user is not an admin of the ORG", async () => {
      vi.mocked(isOrganisationAdmin).mockResolvedValue(false);
      await expect(checkPermissions({ userId: 1, teamId: 1, isOrg: true })).rejects.toThrow();
    });
    it("It should NOT throw an error if the user is an admin of the ORG", async () => {
      vi.mocked(isOrganisationAdmin).mockResolvedValue(mockedReturnSuccessCheckPerms);
      await expect(checkPermissions({ userId: 1, teamId: 1, isOrg: true })).resolves.not.toThrow();
    });
    it("It should throw an error if the user is not an admin of the team", async () => {
      vi.mocked(isTeamAdmin).mockResolvedValue(false);
      await expect(checkPermissions({ userId: 1, teamId: 1 })).rejects.toThrow();
    });
    it("It should NOT throw an error if the user is an admin of a team", async () => {
      vi.mocked(isTeamAdmin).mockResolvedValue(mockedReturnSuccessCheckPerms);
      await expect(checkPermissions({ userId: 1, teamId: 1 })).resolves.not.toThrow();
    });
  });
  describe("getUsernameOrEmailsToInvite", () => {
    it("should throw a TRPCError with code BAD_REQUEST if no emails are provided", async () => {
      await expect(getUsernameOrEmailsToInvite([])).rejects.toThrow(TRPCError);
    });

    it("should return an array with one email if a string is provided", async () => {
      const result = await getUsernameOrEmailsToInvite("test@example.com");
      expect(result).toEqual(["test@example.com"]);
    });

    it("should return an array with multiple emails if an array is provided", async () => {
      const result = await getUsernameOrEmailsToInvite(["test1@example.com", "test2@example.com"]);
      expect(result).toEqual(["test1@example.com", "test2@example.com"]);
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
    const usersEmail = "user@example.com";

    it("should return autoAccept:false when orgVerified is false even if usersEmail domain matches orgAutoAcceptDomain", () => {
      const result = getOrgConnectionInfo({
        orgAutoAcceptDomain,
        orgVerified: false,
        usersEmail,
        team: {
          ...mockedRegularTeam,
          parentId: 2,
        },
        isOrg: false,
      });
      expect(result).toEqual({ orgId: 2, autoAccept: false });
    });

    it("should return orgId and autoAccept as false if team has parent and usersEmail domain does not match orgAutoAcceptDomain", () => {
      const result = getOrgConnectionInfo({
        orgAutoAcceptDomain,
        orgVerified: true,
        usersEmail: "user@other.com",
        team: {
          ...mockedRegularTeam,
          parentId: 2,
        },
        isOrg: false,
      });
      expect(result).toEqual({ orgId: undefined, autoAccept: false });
    });

    it("should return orgId and autoAccept as true if team has no parent and isOrg is true and usersEmail domain matches orgAutoAcceptDomain", () => {
      const result = getOrgConnectionInfo({
        orgAutoAcceptDomain,
        orgVerified: true,
        usersEmail,
        team: { ...mockedRegularTeam, parentId: null },
        isOrg: true,
      });
      expect(result).toEqual({ orgId: 1, autoAccept: true });
    });

    it("should return orgId and autoAccept as false if team has no parent and isOrg is true and usersEmail domain does not match orgAutoAcceptDomain", () => {
      const result = getOrgConnectionInfo({
        orgAutoAcceptDomain,
        orgVerified: false,
        usersEmail: "user@other.com",
        team: { ...mockedRegularTeam, parentId: null },
        isOrg: true,
      });
      expect(result).toEqual({ orgId: undefined, autoAccept: false });
    });

    it("should return orgId and autoAccept as false if team has no parent and isOrg is true and usersEmail domain matches orgAutoAcceptDomain but orgVerified is false", () => {
      const result = getOrgConnectionInfo({
        orgAutoAcceptDomain,
        orgVerified: false,
        usersEmail,
        team: { ...mockedRegularTeam, parentId: null },
        isOrg: true,
      });
      expect(result).toEqual({ orgId: mockedRegularTeam.id, autoAccept: false });
    });
  });
  describe("getIsOrgVerified", () => {
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
      const result = getIsOrgVerified(true, { ...mockedRegularTeam, ...team });
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
      const result = getIsOrgVerified(false, { ...mockedRegularTeam, ...team });
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
      const result = getIsOrgVerified(false, { ...mockedRegularTeam, ...team });
      expect(result).toEqual({
        isInOrgScope: false,
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

    it("should return true when inviting to an organization's team an existing org user", () => {
      const inviteeWithOrg: UserWithMembership = {
        ...invitee,
        profiles: [getSampleProfile({ organizationId: 2 })],
      };
      const teamWithOrg = {
        ...mockedRegularTeam,
        parentId: 2,
      };
      expect(canBeInvited(inviteeWithOrg, teamWithOrg)).toBe(true);
    });

    it("should return false when inviting a user who is already a member of the team", () => {
      const inviteeWithOrg: UserWithMembership = {
        ...invitee,
        profiles: [getSampleProfile()],
        teams: [{ teamId: 1, accepted: true, userId: invitee.id, role: "ADMIN" }],
      };
      const teamWithOrg = {
        ...mockedRegularTeam,
        id: 1,
      };
      expect(canBeInvited(inviteeWithOrg, teamWithOrg)).toBe(false);
    });

    it("should return true if the invitee already exists in Cal.com and is being invited to an organization", () => {
      expect(canBeInvited(invitee, mockedRegularTeam)).toBe(true);
    });

    it("should return true if the invitee does not already belong to another organization and is not being invited to an organization", () => {
      expect(canBeInvited(invitee, mockedRegularTeam)).toBe(true);
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
