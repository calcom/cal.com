import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { TeamBilling } from "@calcom/features/ee/billing/teams";

import { TRPCError } from "@trpc/server";

import { TeamRepository } from "./team";

vi.mock("@calcom/features/ee/billing/teams", () => ({
  TeamBilling: {
    findAndInit: vi.fn(),
    findAndInitMany: vi.fn(),
  },
}));

vi.mock("@calcom/lib/domainManager/organization", () => ({
  deleteDomain: vi.fn(),
}));

vi.mock("@calcom/features/ee/teams/lib/removeMember", () => ({
  default: vi.fn(),
}));

describe("TeamRepository", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("findById", () => {
    it("should return null if team is not found", async () => {
      prismaMock.team.findUnique.mockResolvedValue(null);
      const result = await TeamRepository.findById({ id: 1 });
      expect(result).toBeNull();
    });

    it("should return parsed team if found", async () => {
      const mockTeam = {
        id: 1,
        name: "Test Team",
        slug: "test-team",
        logoUrl: "test-logo-url",
        parentId: 1,
        metadata: {
          requestedSlug: null,
        },
        isOrganization: true,
        organizationSettings: {},
        isPlatform: true,
        requestedSlug: null,
      };
      prismaMock.team.findUnique.mockResolvedValue(mockTeam);
      const result = await TeamRepository.findById({ id: 1 });
      expect(result).toEqual(mockTeam);
    });
  });

  describe("deleteById", () => {
    it("should delete team and related data", async () => {
      const mockDeletedTeam = { id: 1, name: "Deleted Team", isOrganization: true, slug: "deleted-team" };
      prismaMock.team.delete.mockResolvedValue(mockDeletedTeam);

      const mockTeamBilling = { cancel: vi.fn() };
      TeamBilling.findAndInit.mockResolvedValue(mockTeamBilling);

      // Mock the Prisma transaction
      const mockTransaction = {
        eventType: { deleteMany: vi.fn() },
        membership: { deleteMany: vi.fn() },
        team: { delete: vi.fn().mockResolvedValue(mockDeletedTeam) },
      };

      //   Mock the transaction calls so we can spy on it
      prismaMock.$transaction.mockImplementation((callback) => callback(mockTransaction));

      const result = await TeamRepository.deleteById({ id: 1 });

      expect(mockTransaction.eventType.deleteMany).toHaveBeenCalledWith({
        where: {
          teamId: 1,
          schedulingType: "MANAGED",
        },
      });
      expect(mockTransaction.membership.deleteMany).toHaveBeenCalledWith({
        where: {
          teamId: 1,
        },
      });
      expect(mockTransaction.team.delete).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });

      expect(mockTeamBilling.cancel).toHaveBeenCalled();
      expect(result).toEqual(mockDeletedTeam);
    });
  });

  describe("inviteMemberByToken", () => {
    it("should throw error if verification token is not found", async () => {
      prismaMock.verificationToken.findFirst.mockResolvedValue(null);
      await expect(TeamRepository.inviteMemberByToken("invalid-token", 1)).rejects.toThrow(TRPCError);
    });

    it("should create membership and update billing", async () => {
      const mockToken = { teamId: 1, team: { name: "Test Team" } };
      prismaMock.verificationToken.findFirst.mockResolvedValue(mockToken);

      const mockTeamBilling = { updateQuantity: vi.fn() };
      TeamBilling.findAndInit.mockResolvedValue(mockTeamBilling);

      const result = await TeamRepository.inviteMemberByToken("valid-token", 1);

      expect(prismaMock.membership.create).toHaveBeenCalled();
      expect(mockTeamBilling.updateQuantity).toHaveBeenCalled();
      expect(result).toBe("Test Team");
    });
  });

  describe("publish", () => {
    it("should call publish on TeamBilling", async () => {
      const mockTeamBilling = { publish: vi.fn() };
      TeamBilling.findAndInit.mockResolvedValue(mockTeamBilling);

      await TeamRepository.publish(1);

      expect(mockTeamBilling.publish).toHaveBeenCalled();
    });
  });
});
