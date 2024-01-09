import { describe, it, vi, expect } from "vitest";

import { isTeamAdmin } from "@calcom/lib/server/queries";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TeamWithParent } from "./types";
import type { Invitee, UserWithMembership } from "./utils";
import {
  checkPermissions,
  getUsernameOrEmailsToInvite,
  getIsOrgVerified,
  getOrgConnectionInfo,
  validateInviteeEligibility,
  shouldAutoJoinIfInOrg,
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
};

const mockedTeam: TeamWithParent = {
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
};

const mockUser: Invitee = {
  id: 4,
  username: "pro",
  email: "pro@example.com",
  password: "",
  completedOnboarding: true,
  identityProvider: "CAL",
  organizationId: null,
};

const userInTeamAccepted: UserWithMembership = {
  ...mockUser,
  teams: [{ teamId: mockedTeam.id, accepted: true, userId: mockUser.id }],
};

const userInTeamNotAccepted: UserWithMembership = {
  ...mockUser,
  teams: [{ teamId: mockedTeam.id, accepted: false, userId: mockUser.id }],
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

    it("should return orgId and autoAccept as true if team has parent and usersEmail domain matches orgAutoAcceptDomain and orgVerified is true", () => {
      const result = getOrgConnectionInfo({
        orgAutoAcceptDomain,
        orgVerified: true,
        usersEmail,
        team: {
          ...mockedTeam,
          parentId: 2,
        },
        isOrg: false,
      });
      expect(result).toEqual({ orgId: 2, autoAccept: true });
    });

    it("should return orgId and autoAccept as false if team has parent and usersEmail domain does not match orgAutoAcceptDomain", () => {
      const result = getOrgConnectionInfo({
        orgAutoAcceptDomain,
        usersEmail: "user@other.com",
        team: {
          ...mockedTeam,
          parentId: 2,
        },
        isOrg: false,
      });
      expect(result).toEqual({ orgId: undefined, autoAccept: false });
    });

    it("should return orgId and autoAccept as false if team has parent and usersEmail domain matches orgAutoAcceptDomain but orgVerified is false", () => {
      const result = getOrgConnectionInfo({
        orgAutoAcceptDomain,
        orgVerified: false,
        usersEmail,
        team: { ...mockedTeam },
        isOrg: false,
      });
      expect(result).toEqual({ orgId: undefined, autoAccept: false });
    });

    it("should return orgId and autoAccept as true if team has no parent and isOrg is true and usersEmail domain matches orgAutoAcceptDomain and orgVerified is true", () => {
      const result = getOrgConnectionInfo({
        orgAutoAcceptDomain,
        orgVerified: true,
        usersEmail,
        team: { ...mockedTeam, parentId: null },
        isOrg: true,
      });
      expect(result).toEqual({ orgId: 1, autoAccept: true });
    });

    it("should return orgId and autoAccept as false if team has no parent and isOrg is true and usersEmail domain does not match orgAutoAcceptDomain", () => {
      const result = getOrgConnectionInfo({
        orgAutoAcceptDomain,
        usersEmail: "user@other.com",
        team: { ...mockedTeam, parentId: null },
        isOrg: true,
      });
      expect(result).toEqual({ orgId: undefined, autoAccept: false });
    });

    it("should return orgId and autoAccept as false if team has no parent and isOrg is true and usersEmail domain matches orgAutoAcceptDomain but orgVerified is false", () => {
      const result = getOrgConnectionInfo({
        orgAutoAcceptDomain,
        orgVerified: false,
        usersEmail,
        team: { ...mockedTeam, parentId: null },
        isOrg: true,
      });
      expect(result).toEqual({ orgId: mockedTeam.id, autoAccept: false });
    });
  });
  describe("getIsOrgVerified", () => {
    it("should return the correct values when isOrg is true and teamMetadata.orgAutoAcceptEmail is true", () => {
      const team = {
        metadata: {
          isOrganizationVerified: true,
          orgAutoAcceptEmail: "example.com",
        },
        parent: null,
      };
      const result = getIsOrgVerified(true, { ...mockedTeam, ...team });
      expect(result).toEqual({
        isInOrgScope: true,
        orgVerified: true,
        autoAcceptEmailDomain: "example.com",
      });
    });

    it("should return the correct values when orgMetadataIfExists.orgAutoAcceptEmail is true", () => {
      const team = {
        metadata: {},
        parent: {
          ...mockedTeam,
          metadata: {
            isOrganizationVerified: false,
            orgAutoAcceptEmail: "example.com",
          },
        },
      };
      const result = getIsOrgVerified(false, { ...mockedTeam, ...team });
      expect(result).toEqual({
        isInOrgScope: true,
        orgVerified: false,
        autoAcceptEmailDomain: "example.com",
      });
    });

    it("should return the correct values when neither isOrg nor orgMetadataIfExists.orgAutoAcceptEmail is true", () => {
      const team = {
        metadata: {},
        parent: null,
      };
      const result = getIsOrgVerified(false, { ...mockedTeam, ...team });
      expect(result).toEqual({
        isInOrgScope: false,
      });
    });
  });

  describe("validateInviteeEligibility: Check if user can be invited to the team/org", () => {
    const invitee: Invitee = {
      ...mockUser,
      id: 1,
      username: "testuser",
      email: "testuser@example.com",
      organizationId: null,
    };
    const isOrg = false;

    it("should not throw when inviting to an organization's team an existing org user", () => {
      const inviteeWithOrg: Invitee = {
        ...invitee,
        organizationId: 2,
      };
      const teamWithOrg = {
        ...mockedTeam,
        parentId: 2,
      };
      expect(() => validateInviteeEligibility(inviteeWithOrg, teamWithOrg, isOrg)).not.toThrow();
    });

    it("should throw a TRPCError when inviting a user who is already a member of the org", () => {
      const inviteeWithOrg: Invitee = {
        ...invitee,
        organizationId: 1,
      };
      const teamWithOrg = {
        ...mockedTeam,
        id: 1,
      };
      expect(() => validateInviteeEligibility(inviteeWithOrg, teamWithOrg, isOrg)).toThrow(TRPCError);
    });

    it("should throw a TRPCError when inviting a user who is already a member of the team", () => {
      const inviteeWithOrg: UserWithMembership = {
        ...invitee,
        organizationId: null,
        teams: [{ teamId: 1, accepted: true, userId: invitee.id }],
      };
      const teamWithOrg = {
        ...mockedTeam,
        id: 1,
      };
      expect(() => validateInviteeEligibility(inviteeWithOrg, teamWithOrg, isOrg)).toThrow(TRPCError);
    });

    it("should throw a TRPCError with code FORBIDDEN if the invitee is already a member of another organization", () => {
      const inviteeWithOrg: Invitee = {
        ...invitee,
        organizationId: 2,
      };
      const teamWithOrg = {
        ...mockedTeam,
        parentId: 3,
      };
      expect(() => validateInviteeEligibility(inviteeWithOrg, teamWithOrg, isOrg)).toThrow(TRPCError);
    });

    it("should throw a TRPCError with code FORBIDDEN if the invitee already exists in Cal.com and is being invited to an organization", () => {
      const isOrg = true;
      expect(() => validateInviteeEligibility(invitee, mockedTeam, isOrg)).toThrow(TRPCError);
    });

    it("should not throw an error if the invitee does not already belong to another organization and is not being invited to an organization", () => {
      expect(() => validateInviteeEligibility(invitee, mockedTeam, isOrg)).not.toThrow();
    });
  });
  describe("shouldAutoJoinIfInOrg", () => {
    it("should return autoJoined: false if the user is not in the same organization as the team", async () => {
      const result = await shouldAutoJoinIfInOrg({
        team: mockedTeam,
        invitee: userInTeamAccepted,
      });
      expect(result).toEqual(false);
    });

    it("should return autoJoined: false if the team does not have a parent organization", async () => {
      const result = await shouldAutoJoinIfInOrg({
        team: { ...mockedTeam, parentId: null },
        invitee: userInTeamAccepted,
      });
      expect(result).toEqual(false);
    });

    it("should return `autoJoined: false` if team has parent organization and invitee has not accepted membership to organization", async () => {
      const result = await shouldAutoJoinIfInOrg({
        team: { ...mockedTeam, parentId: mockedTeam.id },
        invitee: { ...userInTeamNotAccepted, organizationId: mockedTeam.id },
      });
      expect(result).toEqual(false);
    });
    it("should return `autoJoined: true` if team has parent organization and invitee has accepted membership to organization", async () => {
      const result = await shouldAutoJoinIfInOrg({
        team: { ...mockedTeam, parentId: mockedTeam.id },
        invitee: { ...userInTeamAccepted, organizationId: mockedTeam.id },
      });
      expect(result).toEqual(true);
    });
  });
});
