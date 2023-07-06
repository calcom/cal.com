import { describe, it, vi, expect } from "vitest";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { checkInputEmailIsValid, checkPermissions, getEmailsToInvite, getIsOrgVerified, getOrgConnectionInfo, throwIfInviteIsToOrgAndUserExists } from "./utils";
import { MembershipRole } from "@calcom/prisma/enums";
import { isTeamAdmin } from "@calcom/lib/server/queries";
import { TRPCError } from "@trpc/server";
import type { TeamWithParent } from "./types";
import type { User } from "@calcom/prisma/client";

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

const mockedReturnSuccessCheckPerms = { accepted: true, disableImpersonation: false, id: 1, role: MembershipRole.ADMIN, userId: 1, teamId: 1 }

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
  parent: null
};

const mockUser: User = {
  id: 4,
  username: 'pro',
  name: 'Pro Example',
  email: 'pro@example.com',
  emailVerified: new Date(),
  password: '',
  bio: null,
  avatar: null,
  timeZone: 'Europe/London',
  weekStart: 'Sunday',
  startTime: 0,
  endTime: 1440,
  bufferTime: 0,
  hideBranding: false,
  theme: null,
  createdDate: new Date(),
  trialEndsAt: null,
  defaultScheduleId: null,
  completedOnboarding: true,
  locale: 'en',
  timeFormat: 12,
  twoFactorSecret: null,
  twoFactorEnabled: false,
  identityProvider: 'CAL',
  identityProviderId: null,
  invitedTo: null,
  brandColor: '#292929',
  darkBrandColor: '#fafafa',
  away: false,
  allowDynamicBooking: true,
  metadata: null,
  verified: false,
  role: 'USER',
  disableImpersonation: false,
  organizationId: null
}

describe("Invite Member Utils", () => {
  describe("checkPermissions", () => {
    it("It should throw an error if the user is not an admin of the ORG", async () => {
      vi.mocked(isOrganisationAdmin).mockResolvedValue(false);
      await expect(checkPermissions({ userId: 1, teamId: 1, isOrg: true })).rejects.toThrow();
    })
    it("It should NOT throw an error if the user is an admin of the ORG", async () => {
      vi.mocked(isOrganisationAdmin).mockResolvedValue(mockedReturnSuccessCheckPerms);
      await expect(checkPermissions({ userId: 1, teamId: 1, isOrg: true })).resolves.not.toThrow();
    })
    it("It should throw an error if the user is not an admin of the team", async () => {
      vi.mocked(isTeamAdmin).mockResolvedValue(false);
      await expect(checkPermissions({ userId: 1, teamId: 1 })).rejects.toThrow();
    })
    it("It should NOT throw an error if the user is an admin of a team", async () => {
      vi.mocked(isTeamAdmin).mockResolvedValue(mockedReturnSuccessCheckPerms);
      await expect(checkPermissions({ userId: 1, teamId: 1 })).resolves.not.toThrow();
    })
  })
  describe('getEmailsToInvite', () => {
    it('should throw a TRPCError with code BAD_REQUEST if no emails are provided', async () => {
      await expect(getEmailsToInvite([])).rejects.toThrow(TRPCError);
    });

    it('should return an array with one email if a string is provided', async () => {
      const result = await getEmailsToInvite('test@example.com');
      expect(result).toEqual(['test@example.com']);
    });

    it('should return an array with multiple emails if an array is provided', async () => {
      const result = await getEmailsToInvite(['test1@example.com', 'test2@example.com']);
      expect(result).toEqual(['test1@example.com', 'test2@example.com']);
    });
  });
  describe('checkInputEmailIsValid', () => {
    it('should throw a TRPCError with code BAD_REQUEST if the email is invalid', () => {
      const invalidEmail = 'invalid-email';
      expect(() => checkInputEmailIsValid(invalidEmail)).toThrow(TRPCError);
      expect(() => checkInputEmailIsValid(invalidEmail)).toThrowError(
        'Invite failed because invalid-email is not a valid email address'
      );
    });

    it('should not throw an error if the email is valid', () => {
      const validEmail = 'valid-email@example.com';
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

  describe("throwIfInviteIsToOrgAndUserExists", () => {
    const invitee: User = {
      ...mockUser,
      id: 1,
      username: "testuser",
      email: "testuser@example.com",
      organizationId: null,
    };
    const isOrg = false;

    it("should throw a TRPCError with code FORBIDDEN if the invitee is already a member of another organization", () => {
      const inviteeWithOrg: User = {
        ...invitee,
        organizationId: 2,
      };
      const teamWithOrg = {
        ...mockedTeam,
        parentId: 2,
      }
      expect(() =>
        throwIfInviteIsToOrgAndUserExists(inviteeWithOrg, teamWithOrg, isOrg)
      ).toThrow(TRPCError);
    });

    it("should throw a TRPCError with code FORBIDDEN if the invitee already exists in Cal.com and is being invited to an organization", () => {
      const isOrg = true;
      expect(() =>
        throwIfInviteIsToOrgAndUserExists(invitee, mockedTeam, isOrg)
      ).toThrow(TRPCError);
    });

    it("should not throw an error if the invitee does not already belong to another organization and is not being invited to an organization", () => {
      expect(() =>
        throwIfInviteIsToOrgAndUserExists(invitee, mockedTeam, isOrg)
      ).not.toThrow();
    });
  });
})