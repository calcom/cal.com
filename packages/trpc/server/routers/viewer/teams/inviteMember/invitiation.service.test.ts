import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { sendTeamInviteEmail } from "@calcom/emails";
import logger from "@calcom/lib/logger";
import { VerificationTokenRepository } from "@calcom/lib/server/repository/verificationToken";

import { InvitationService } from "./invitiation.service";

vi.mock("@calcom/emails", () => ({
  sendTeamInviteEmail: vi.fn(),
}));

vi.mock("@calcom/lib/server/repository/verificationToken", () => ({
  VerificationTokenRepository: {
    create: vi.fn(),
  },
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("sendEmails", () => {
    it("should handle successful email sending", async () => {
      const successfulPromise = Promise.resolve();
      await InvitationService.sendEmails([successfulPromise]);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("should handle failed email sending", async () => {
      const error = new Error("Failed to send email");
      const failedPromise = Promise.reject(error);
      await InvitationService.sendEmails([failedPromise]);
      expect(logger.error).toHaveBeenCalledWith("Could not send email to user. Reason:", error);
    });
  });

  describe("sendExistingUserTeamInviteEmails", () => {
    const mockUser = {
      email: "test@example.com",
      username: "testuser",
      completedOnboarding: true,
      identityProvider: "CAL",
      password: { hash: "hashedpassword" },
      profile: { username: "testuser" },
    };

    const mockParams = {
      existingUsersWithMemberships: [mockUser],
      language: vi.fn() as any,
      currentUserTeamName: "Test Team",
      currentUserName: "Test Admin",
      currentUserParentTeamName: undefined,
      isOrg: false,
      teamId: 1,
      isAutoJoin: false,
      orgSlug: null,
    };

    it("should send team invite email for existing user", async () => {
      await InvitationService.sendExistingUserTeamInviteEmails(mockParams);

      expect(sendTeamInviteEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          teamName: mockParams.currentUserTeamName,
          from: mockParams.currentUserName,
          isCalcomMember: true,
          isAutoJoin: false,
          isOrg: false,
        })
      );
    });

    it("should create verification token for incomplete onboarding", async () => {
      const incompleteUser = {
        ...mockUser,
        completedOnboarding: false,
        password: null,
      };

      await InvitationService.sendExistingUserTeamInviteEmails({
        ...mockParams,
        existingUsersWithMemberships: [incompleteUser],
      });

      expect(VerificationTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: incompleteUser.email,
          teamId: mockParams.teamId,
        })
      );

      expect(sendTeamInviteEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          isCalcomMember: false,
          joinLink: expect.stringContaining("/signup?token="),
        })
      );
    });

    it("should throw error if team name is missing", async () => {
      await expect(
        InvitationService.sendExistingUserTeamInviteEmails({
          ...mockParams,
          currentUserTeamName: undefined,
        })
      ).rejects.toThrow("The team doesn't have a name");
    });
  });

  describe("sendSignupToOrganizationEmail", () => {
    const mockParams = {
      usernameOrEmail: "newuser@example.com",
      team: {
        name: "Test Org",
        parent: null,
      },
      translation: vi.fn() as any,
      inviterName: "Test Admin",
      teamId: 1,
      isOrg: true,
    };

    it("should send organization signup email", async () => {
      await InvitationService.sendSignupToOrganizationEmail(mockParams);

      expect(VerificationTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: mockParams.usernameOrEmail,
          teamId: mockParams.teamId,
        })
      );

      expect(sendTeamInviteEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockParams.usernameOrEmail,
          teamName: mockParams.team.name,
          from: mockParams.inviterName,
          isCalcomMember: false,
          isOrg: true,
        })
      );
    });

    it("should handle errors gracefully", async () => {
      const error = new Error("Failed to send email");
      vi.mocked(sendTeamInviteEmail).mockRejectedValueOnce(error);

      await InvitationService.sendSignupToOrganizationEmail(mockParams);

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to send signup to organization email",
        expect.objectContaining({
          usernameOrEmail: mockParams.usernameOrEmail,
          orgId: mockParams.teamId,
        }),
        error
      );
    });
  });
});
