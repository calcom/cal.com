import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";

import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { MembershipRole, Prisma } from "@calcom/prisma/client";

import { MembershipRepository } from "./membership";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    membership: {
      createMany: vi.fn(),
    },
  },
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    error: vi.fn(),
    getSubLogger: vi.fn(() => ({
      debug: vi.fn(),
    })),
  },
}));

describe("MembershipRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("createBulkMemberships", () => {
    it("should create memberships for team", async () => {
      const mockInvitees = [
        {
          id: 1,
          newRole: MembershipRole.MEMBER,
          needToCreateOrgMembership: false,
        },
      ];

      await MembershipRepository.createBulkMemberships({
        teamId: 1,
        invitees: mockInvitees,
        parentId: null,
        accepted: true,
      });

      expect(prisma.membership.createMany).toHaveBeenCalledWith({
        data: [
          {
            createdAt: expect.any(Date),
            teamId: 1,
            userId: 1,
            accepted: true,
            role: MembershipRole.MEMBER,
          },
        ],
      });
    });

    it("should create memberships for team and parent org", async () => {
      const mockInvitees = [
        {
          id: 1,
          newRole: MembershipRole.MEMBER,
          needToCreateOrgMembership: true,
        },
      ];

      await MembershipRepository.createBulkMemberships({
        teamId: 2,
        invitees: mockInvitees,
        parentId: 1,
        accepted: true,
      });

      expect(prisma.membership.createMany).toHaveBeenCalledWith({
        data: [
          {
            createdAt: expect.any(Date),
            teamId: 2,
            userId: 1,
            accepted: true,
            role: MembershipRole.MEMBER,
          },
          {
            createdAt: expect.any(Date),
            teamId: 1,
            userId: 1,
            accepted: true,
            role: MembershipRole.MEMBER,
          },
        ],
      });
    });

    it("should handle Prisma errors", async () => {
      const mockError = new Prisma.PrismaClientKnownRequestError("Test error", {
        code: "P2002",
        clientVersion: "1",
      });

      (prisma.membership.createMany as jest.Mock).mockRejectedValueOnce(mockError);

      const mockInvitees = [
        {
          id: 1,
          newRole: MembershipRole.MEMBER,
          needToCreateOrgMembership: false,
        },
      ];

      await expect(
        MembershipRepository.createBulkMemberships({
          teamId: 1,
          invitees: mockInvitees,
          parentId: null,
          accepted: true,
        })
      ).rejects.toThrow("Failed to create memberships for team 1");

      expect(logger.error).toHaveBeenCalledWith("Failed to create memberships", { teamId: 1 });
    });

    it("should throw non-Prisma errors as is", async () => {
      const mockError = new Error("Random error");
      (prisma.membership.createMany as jest.Mock).mockRejectedValueOnce(mockError);

      const mockInvitees = [
        {
          id: 1,
          newRole: MembershipRole.MEMBER,
          needToCreateOrgMembership: false,
        },
      ];

      await expect(
        MembershipRepository.createBulkMemberships({
          teamId: 1,
          invitees: mockInvitees,
          parentId: null,
          accepted: true,
        })
      ).rejects.toThrow(mockError);
    });
  });
});
