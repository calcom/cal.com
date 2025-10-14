import prismaMock from "../../../../../tests/libs/__mocks__/prismaMock";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { TeamBilling } from "@calcom/features/ee/billing/teams";
import { updateNewTeamMemberEventTypes } from "@calcom/features/ee/teams/lib/queries";
import { createAProfileForAnExistingUser } from "@calcom/features/profile/lib/createAProfileForAnExistingUser";
import { deleteDomain } from "@calcom/lib/domainManager/organization";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { WorkflowService } from "@calcom/lib/server/service/workflows";
import type { Membership, Team, User, VerificationToken, Profile } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import { TeamService } from "./teamService";

vi.mock("@calcom/features/ee/billing/teams");
vi.mock("@calcom/lib/server/repository/team");
vi.mock("@calcom/lib/server/service/workflows");
vi.mock("@calcom/lib/domainManager/organization");
vi.mock("@calcom/features/ee/teams/lib/removeMember");
vi.mock("@calcom/features/profile/lib/createAProfileForAnExistingUser");
vi.mock("@calcom/features/ee/teams/lib/queries");

const mockTeamBilling = {
  cancel: vi.fn(),
  updateQuantity: vi.fn(),
  publish: vi.fn(),
  downgrade: vi.fn(),
};

vi.mocked(TeamBilling.findAndInit).mockResolvedValue(mockTeamBilling);

describe("TeamService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(TeamBilling.findAndInit).mockResolvedValue(mockTeamBilling);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("delete", () => {
    it("should delete team, cancel billing, and clean up", async () => {
      const mockDeletedTeam = {
        id: 1,
        name: "Deleted Team",
        isOrganization: true,
        slug: "deleted-team",
      };
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const mockTeamRepo = {
        deleteById: vi.fn().mockResolvedValue(mockDeletedTeam),
      } as Pick<TeamRepository, "deleteById">;
      vi.mocked(TeamRepository).mockImplementation(() => mockTeamRepo);

      const result = await TeamService.delete({ id: 1 });

      expect(TeamBilling.findAndInit).toHaveBeenCalledWith(1);
      expect(mockTeamBilling.cancel).toHaveBeenCalled();
      expect(WorkflowService.deleteWorkflowRemindersOfRemovedTeam).toHaveBeenCalledWith(1);
      expect(mockTeamRepo.deleteById).toHaveBeenCalledWith({ id: 1 });
      expect(deleteDomain).toHaveBeenCalledWith("deleted-team");
      expect(result).toEqual(mockDeletedTeam);
    });
  });

  describe("inviteMemberByToken", () => {
    it("should throw error if verification token is not found", async () => {
      prismaMock.verificationToken.findFirst.mockResolvedValue(null);
      await expect(TeamService.inviteMemberByToken("invalid-token", 1)).rejects.toThrow(TRPCError);
    });

    it("should create provisional membership and update billing", async () => {
      const mockToken = {
        teamId: 1,
        team: { name: "Test Team" },
        expiresInDays: null,
        expires: new Date(Date.now() + 86400000),
        token: "valid-token",
        identifier: "test@example.com",
        id: "1",
      };
      prismaMock.verificationToken.findFirst.mockResolvedValue(mockToken);
      prismaMock.membership.create.mockResolvedValue({} as Membership);

      const result = await TeamService.inviteMemberByToken("valid-token", 1);

      expect(prismaMock.membership.create).toHaveBeenCalledWith({
        data: {
          accepted: false,
          createdAt: expect.any(Date),
          role: MembershipRole.MEMBER,
          teamId: 1,
          userId: 1,
        },
      });
      expect(mockTeamBilling.updateQuantity).toHaveBeenCalled();
      expect(result).toBe("Test Team");
    });
  });

  describe("acceptTeamMembership", () => {
    it("should accept membership and update event types for regular team", async () => {
      const mockMembership = {
        team: { id: 1, parentId: null, isOrganization: false },
      };

      prismaMock.membership.update.mockResolvedValue(mockMembership as Membership & { team: Team });
      vi.mocked(updateNewTeamMemberEventTypes).mockResolvedValue(undefined);

      await TeamService.acceptTeamMembership({
        userId: 1,
        teamId: 1,
        userEmail: "test@example.com",
        username: "testuser",
      });

      expect(prismaMock.membership.update).toHaveBeenCalledWith({
        where: { userId_teamId: { userId: 1, teamId: 1 } },
        data: { accepted: true },
        select: { team: true },
      });
      expect(updateNewTeamMemberEventTypes).toHaveBeenCalledWith(1, 1);
    });

    it("should accept membership and create profile for organization", async () => {
      const mockMembership = {
        team: { id: 1, parentId: null, isOrganization: true },
      };

      prismaMock.membership.update.mockResolvedValue(mockMembership as Membership & { team: Team });
      vi.mocked(createAProfileForAnExistingUser).mockResolvedValue({} as Profile);
      vi.mocked(updateNewTeamMemberEventTypes).mockResolvedValue(undefined);

      await TeamService.acceptTeamMembership({
        userId: 1,
        teamId: 1,
        userEmail: "test@example.com",
        username: "testuser",
      });

      expect(createAProfileForAnExistingUser).toHaveBeenCalledWith({
        user: {
          id: 1,
          email: "test@example.com",
          currentUsername: "testuser",
        },
        organizationId: 1,
      });
    });

    it("should accept membership and handle parent team for subteam", async () => {
      const mockMembership = {
        team: { id: 1, parentId: 2, isOrganization: false },
      };

      prismaMock.membership.update
        .mockResolvedValueOnce(mockMembership as Membership & { team: Team })
        .mockResolvedValueOnce({} as Membership);
      vi.mocked(createAProfileForAnExistingUser).mockResolvedValue({} as Profile);
      vi.mocked(updateNewTeamMemberEventTypes).mockResolvedValue(undefined);

      await TeamService.acceptTeamMembership({
        userId: 1,
        teamId: 1,
        userEmail: "test@example.com",
        username: "testuser",
      });

      expect(prismaMock.membership.update).toHaveBeenCalledTimes(2);
      expect(prismaMock.membership.update).toHaveBeenNthCalledWith(2, {
        where: { userId_teamId: { userId: 1, teamId: 2 } },
        data: { accepted: true },
      });
      expect(createAProfileForAnExistingUser).toHaveBeenCalledWith({
        user: {
          id: 1,
          email: "test@example.com",
          currentUsername: "testuser",
        },
        organizationId: 2,
      });
    });
  });
  describe("leaveTeamMembership", () => {
    it("should delete membership when rejecting invitation", async () => {
      const mockMembership = {
        team: { id: 1, parentId: null },
      };

      prismaMock.membership.delete.mockResolvedValue(mockMembership as Membership & { team: Team });

      await TeamService.leaveTeamMembership({
        userId: 1,
        teamId: 1,
      });

      expect(prismaMock.membership.delete).toHaveBeenCalledWith({
        where: { userId_teamId: { userId: 1, teamId: 1 } },
        select: { team: true },
      });
    });

    it("should delete parent membership when rejecting subteam invitation", async () => {
      const mockMembership = {
        team: { id: 1, parentId: 2 },
      };

      prismaMock.membership.delete
        .mockResolvedValueOnce(mockMembership as Membership & { team: Team })
        .mockResolvedValueOnce({} as Membership);

      await TeamService.leaveTeamMembership({
        userId: 1,
        teamId: 1,
      });

      expect(prismaMock.membership.delete).toHaveBeenCalledTimes(2);
      expect(prismaMock.membership.delete).toHaveBeenNthCalledWith(2, {
        where: { userId_teamId: { userId: 1, teamId: 2 } },
      });
    });
  });

  describe("acceptInvitationByToken", () => {
    it("should throw error if verification token is not found", async () => {
      prismaMock.verificationToken.findFirst.mockResolvedValue(null);
      await expect(TeamService.acceptInvitationByToken("invalid-token", 1)).rejects.toThrow(TRPCError);
    });

    it("should throw error if token is not associated with team", async () => {
      const mockToken = {
        teamId: null,
        team: null,
        identifier: "test@example.com",
        id: "1",
      };

      prismaMock.verificationToken.findFirst.mockResolvedValue(
        mockToken as VerificationToken & { team: Team | null }
      );

      await expect(TeamService.acceptInvitationByToken("valid-token", 1)).rejects.toThrow(
        new TRPCError({
          code: "NOT_FOUND",
          message: "Invite token is not associated with any team",
        })
      );
    });

    it("should throw error if user not found", async () => {
      const mockToken = {
        teamId: 1,
        team: { name: "Test Team" },
        identifier: "test@example.com",
        id: "1",
      };

      prismaMock.verificationToken.findFirst.mockResolvedValue(
        mockToken as VerificationToken & { team: Team }
      );
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(TeamService.acceptInvitationByToken("valid-token", 1)).rejects.toThrow(
        new TRPCError({ code: "NOT_FOUND", message: "User not found" })
      );
    });

    it("should throw error if user email doesn't match token identifier", async () => {
      const mockToken = {
        teamId: 1,
        team: { name: "Test Team" },
        identifier: "invited@example.com",
        id: "1",
      };

      const mockUser = {
        email: "different@example.com",
        username: "testuser",
      };

      prismaMock.verificationToken.findFirst.mockResolvedValue(
        mockToken as VerificationToken & { team: Team }
      );
      prismaMock.user.findUnique.mockResolvedValue(mockUser as User);

      await expect(TeamService.acceptInvitationByToken("valid-token", 1)).rejects.toThrow(
        new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation is not for your account",
        })
      );
    });

    it("should throw error if user username doesn't match token identifier", async () => {
      const mockToken = {
        teamId: 1,
        team: { name: "Test Team" },
        identifier: "inviteduser",
        id: "1",
      };

      const mockUser = {
        email: "test@example.com",
        username: "differentuser",
      };

      prismaMock.verificationToken.findFirst.mockResolvedValue(
        mockToken as VerificationToken & { team: Team }
      );
      prismaMock.user.findUnique.mockResolvedValue(mockUser as User);

      await expect(TeamService.acceptInvitationByToken("valid-token", 1)).rejects.toThrow(
        new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation is not for your account",
        })
      );
    });

    it("should accept invitation when user email matches token identifier", async () => {
      const mockToken = {
        teamId: 1,
        team: { name: "Test Team" },
        identifier: "test@example.com",
        id: "1",
      };

      const mockUser = {
        email: "test@example.com",
        username: "testuser",
      };

      const mockMembership = {
        team: { id: 1, parentId: null, isOrganization: false },
      };

      prismaMock.verificationToken.findFirst.mockResolvedValue(
        mockToken as VerificationToken & { team: Team }
      );
      prismaMock.user.findUnique.mockResolvedValue(mockUser as User);
      prismaMock.membership.update.mockResolvedValue(mockMembership as Membership & { team: Team });
      vi.mocked(updateNewTeamMemberEventTypes).mockResolvedValue(undefined);

      await TeamService.acceptInvitationByToken("valid-token", 1);

      expect(prismaMock.membership.update).toHaveBeenCalledWith({
        where: { userId_teamId: { userId: 1, teamId: 1 } },
        data: { accepted: true },
        select: { team: true },
      });
    });

    it("should accept invitation when user username matches token identifier", async () => {
      const mockToken = {
        teamId: 1,
        team: { name: "Test Team" },
        identifier: "testuser",
        id: "1",
      };

      const mockUser = {
        email: "testuser@example.com",
        username: "testuser",
      };

      const mockMembership = {
        team: { id: 1, parentId: null, isOrganization: false },
      };

      prismaMock.verificationToken.findFirst.mockResolvedValue(
        mockToken as VerificationToken & { team: Team }
      );
      prismaMock.user.findUnique.mockResolvedValue(mockUser as User);
      prismaMock.membership.update.mockResolvedValue(mockMembership as Membership & { team: Team });
      vi.mocked(updateNewTeamMemberEventTypes).mockResolvedValue(undefined);

      await TeamService.acceptInvitationByToken("valid-token", 1);

      expect(prismaMock.membership.update).toHaveBeenCalledWith({
        where: { userId_teamId: { userId: 1, teamId: 1 } },
        data: { accepted: true },
        select: { team: true },
      });
    });
  });

  describe("publish", () => {
    it("should call publish on TeamBilling", async () => {
      await TeamService.publish(1);

      expect(TeamBilling.findAndInit).toHaveBeenCalledWith(1);
      expect(mockTeamBilling.publish).toHaveBeenCalled();
    });
  });
});
