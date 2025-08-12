import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { TeamBilling } from "@calcom/features/ee/billing/teams";
import { deleteDomain } from "@calcom/lib/domainManager/organization";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { WorkflowService } from "@calcom/lib/server/service/workflows";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import { TeamService } from "./teamService";

vi.mock("@calcom/features/ee/billing/teams");
vi.mock("@calcom/lib/server/repository/team");
vi.mock("@calcom/lib/server/service/workflows");
vi.mock("@calcom/lib/domainManager/organization");
vi.mock("@calcom/features/ee/teams/lib/removeMember");

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
      };
      vi.mocked(TeamRepository).mockImplementation(() => mockTeamRepo as any);

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

    it("should create membership and update billing", async () => {
      const mockToken = {
        teamId: 1,
        team: { name: "Test Team" },
        expiresInDays: null,
        expires: new Date(Date.now() + 86400000),
        token: "valid-token",
        identifier: "valid-token",
        id: "1",
      };
      prismaMock.verificationToken.findFirst.mockResolvedValue(mockToken);

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

  describe("publish", () => {
    it("should call publish on TeamBilling", async () => {
      await TeamService.publish(1);

      expect(TeamBilling.findAndInit).toHaveBeenCalledWith(1);
      expect(mockTeamBilling.publish).toHaveBeenCalled();
    });
  });
});
