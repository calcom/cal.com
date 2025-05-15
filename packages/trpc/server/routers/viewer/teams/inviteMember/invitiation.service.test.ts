import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { sendTeamInviteEmail } from "@calcom/emails";
import logger from "@calcom/lib/logger";
import { updateNewTeamMemberEventTypes } from "@calcom/lib/server/queries/teams";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { MembershipRole, CreationSource } from "@calcom/prisma/enums";

import { InvitationService } from "./invitiation.service";
import type { TeamWithParent } from "./types";

vi.mock("@calcom/emails", () => ({
  sendTeamInviteEmail: vi.fn(),
}));

vi.mock("@calcom/lib/server/repository/verificationToken", () => ({
  VerificationTokenRepository: {
    create: vi.fn(),
  },
}));

vi.mock("@calcom/lib/server/repository/membership", () => ({
  MembershipRepository: {
    createBulkMembershipsForTeam: vi.fn(),
    createBulkMembershipsForOrganization: vi.fn(),
    createNewUsersConnectToOrgIfExists: vi.fn(),
  },
}));

vi.mock("@calcom/lib/server/queries/teams", () => ({
  updateNewTeamMemberEventTypes: vi.fn(),
}));

vi.mock("@calcom/lib/createAProfileForAnExistingUser", () => ({
  createAProfileForAnExistingUser: vi.fn(),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    error: vi.fn(),
    getSubLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
    }),
  },
}));

describe("InvitationService", () => {
  let invitationService: InvitationService;

  beforeEach(() => {
    vi.clearAllMocks();
    invitationService = new InvitationService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("sendEmails", () => {
    it("should handle successful email sending", async () => {
      const successfulPromise = Promise.resolve();
      await invitationService.sendEmails([successfulPromise]);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("should handle failed email sending", async () => {
      const error = new Error("Failed to send email");
      const failedPromise = Promise.reject(error);
      await invitationService.sendEmails([failedPromise]);
      expect(logger.error).toHaveBeenCalledWith("Could not send email to user. Reason:", error);
    });
  });

  describe("handleExistingUsersInvites", () => {
    const baseTeam = {
      id: 1,
      name: "Test Team",
      slug: null,
      logoUrl: null,
      calVideoLogo: null,
      appLogo: null,
      appIconLogo: null,
      bio: null,
      hideBranding: false,
      brandColor: null,
      darkBrandColor: null,
      theme: null,
      timeZone: "Europe/London",
      weekStart: "Sunday",
      timeFormat: null,
      metadata: null,
      isPrivate: false,
      pendingPayment: false,
      organizationSettings: null,
      organizationId: null,
      isOrganizationVerified: false,
      isOrganizationConfigured: false,
      orgAutoAcceptEmail: null,
      inviteToken: null,
      isEnabled: true,
      includeManagedEventsInLimits: false,
      hideTeamProfileLink: false,
      hideBookATeamMember: false,
      rrResetInterval: "MONTH",
      bannerUrl: null,
      isOrganization: false,
      parent: null,
      parentId: null,
      isPlatform: false,
      createdByOAuthClientId: null,
      smsLockState: "UNLOCKED",
      smsLockReviewedByAdmin: false,
      bookingLimits: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as const;

    const mockTeam: TeamWithParent = {
      ...baseTeam,
    };

    const mockUser = {
      id: 1,
      email: "test@example.com",
      username: "testuser",
      completedOnboarding: true,
      identityProvider: "CAL",
      password: { hash: "hashedpassword" },
      profile: { username: "testuser" },
      newRole: MembershipRole.MEMBER,
      needToCreateProfile: null,
      needToCreateOrgMembership: null,
    };

    const mockParams = {
      invitableUsers: [mockUser],
      team: mockTeam,
      orgConnectInfoByUsernameOrEmail: {
        "test@example.com": { orgId: undefined, autoAccept: false },
      },
      teamId: 1,
      language: vi.fn() as any,
      inviter: { name: "Test Admin" },
      orgSlug: null,
      isOrg: false,
    };

    it("should handle team invites correctly", async () => {
      await invitationService.handleExistingUsersInvites(mockParams);

      expect(MembershipRepository.createBulkMembershipsForTeam).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: mockParams.teamId,
          regularUsers: [mockUser],
          autoJoinUsers: [],
        })
      );

      expect(sendTeamInviteEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          teamName: mockTeam.name,
          isAutoJoin: false,
        })
      );
    });

    it("should handle auto-join users correctly", async () => {
      const autoJoinParams = {
        ...mockParams,
        orgConnectInfoByUsernameOrEmail: {
          "test@example.com": { orgId: undefined, autoAccept: true },
        },
      };

      await invitationService.handleExistingUsersInvites(autoJoinParams);

      expect(updateNewTeamMemberEventTypes).toHaveBeenCalledWith(mockUser.id, mockTeam.id);
      expect(sendTeamInviteEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          isAutoJoin: true,
        })
      );
    });

    it("should handle organization invites correctly", async () => {
      const orgParams = {
        ...mockParams,
        team: { ...mockTeam, isOrganization: true },
        isOrg: true,
      };

      await invitationService.handleExistingUsersInvites(orgParams);

      expect(MembershipRepository.createBulkMembershipsForOrganization).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgParams.team.id,
          invitableUsers: [mockUser],
        })
      );
    });
  });

  describe("handleNewUsersInvites", () => {
    const baseTeam = {
      id: 1,
      name: "Test Team",
      slug: null,
      logoUrl: null,
      calVideoLogo: null,
      appLogo: null,
      appIconLogo: null,
      bio: null,
      hideBranding: false,
      brandColor: null,
      darkBrandColor: null,
      theme: null,
      timeZone: "Europe/London",
      weekStart: "Sunday",
      timeFormat: null,
      metadata: null,
      isPrivate: false,
      pendingPayment: false,
      organizationSettings: null,
      organizationId: null,
      isOrganizationVerified: false,
      isOrganizationConfigured: false,
      orgAutoAcceptEmail: null,
      inviteToken: null,
      isEnabled: true,
      includeManagedEventsInLimits: false,
      hideTeamProfileLink: false,
      hideBookATeamMember: false,
      rrResetInterval: "MONTH",
      bannerUrl: null,
      isOrganization: false,
      parent: null,
      parentId: null,
      isPlatform: false,
      createdByOAuthClientId: null,
      smsLockState: "UNLOCKED",
      smsLockReviewedByAdmin: false,
      bookingLimits: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as const;

    const mockTeam: TeamWithParent = {
      ...baseTeam,
    };

    const mockInvitation = {
      usernameOrEmail: "newuser@example.com",
      role: MembershipRole.MEMBER,
    };

    const mockParams = {
      invitationsForNewUsers: [mockInvitation],
      team: mockTeam,
      orgConnectInfoByUsernameOrEmail: {
        "newuser@example.com": { orgId: undefined, autoAccept: false },
      },
      teamId: 1,
      language: vi.fn() as any,
      isOrg: false,
      autoAcceptEmailDomain: null,
      inviter: { name: "Test Admin" },
      creationSource: CreationSource.WEBAPP,
    };

    it("should create new users and send invites", async () => {
      await invitationService.handleNewUsersInvites(mockParams);

      expect(MembershipRepository.createNewUsersConnectToOrgIfExists).toHaveBeenCalledWith(
        expect.objectContaining({
          invitations: [mockInvitation],
          teamId: mockParams.teamId,
          isOrg: false,
        })
      );

      expect(sendTeamInviteEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockInvitation.usernameOrEmail,
          teamName: mockTeam.name,
          isCalcomMember: false,
        })
      );
    });

    it("should handle auto-accept domain correctly", async () => {
      const autoAcceptParams = {
        ...mockParams,
        autoAcceptEmailDomain: "example.com",
        orgConnectInfoByUsernameOrEmail: {
          "newuser@example.com": { orgId: undefined, autoAccept: true },
        },
      };

      await invitationService.handleNewUsersInvites(autoAcceptParams);

      expect(MembershipRepository.createNewUsersConnectToOrgIfExists).toHaveBeenCalledWith(
        expect.objectContaining({
          autoAcceptEmailDomain: "example.com",
        })
      );
    });

    it("should handle organization invites correctly", async () => {
      const orgParams = {
        ...mockParams,
        isOrg: true,
        team: { ...mockTeam, isOrganization: true },
      };

      await invitationService.handleNewUsersInvites(orgParams);

      expect(MembershipRepository.createNewUsersConnectToOrgIfExists).toHaveBeenCalledWith(
        expect.objectContaining({
          isOrg: true,
        })
      );

      expect(sendTeamInviteEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          isOrg: true,
        })
      );
    });
  });
});
