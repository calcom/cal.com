import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { vi, describe, expect, it, beforeEach, afterEach } from "vitest";

import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { MembershipRole, Prisma } from "@calcom/prisma/client";

import { MembershipRepository } from "./membership";

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn().mockResolvedValue("Default Schedule"),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    error: vi.fn(),
    getSubLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/prisma", () => ({
  prisma: prismaMock,
}));

describe("MembershipRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTranslation).mockResolvedValue("Default Schedule");
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

      expect(prismaMock.membership.createMany).toHaveBeenCalledWith({
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

      expect(prismaMock.membership.createMany).toHaveBeenCalledWith({
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

      vi.mocked(prismaMock.membership.createMany).mockRejectedValueOnce(mockError);

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
      vi.mocked(prismaMock.membership.createMany).mockRejectedValueOnce(mockError);

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

  describe("createBulkMembershipsForTeam", () => {
    it("should create memberships for auto-join and regular users", async () => {
      const mockAutoJoinUsers = [
        {
          id: 1,
          newRole: MembershipRole.MEMBER,
          needToCreateProfile: true,
          needToCreateOrgMembership: true,
        },
      ];

      const mockRegularUsers = [
        {
          id: 2,
          newRole: MembershipRole.MEMBER,
          needToCreateProfile: false,
          needToCreateOrgMembership: false,
        },
      ];

      await MembershipRepository.createBulkMembershipsForTeam({
        teamId: 1,
        autoJoinUsers: mockAutoJoinUsers,
        regularUsers: mockRegularUsers,
        parentId: 2,
      });

      expect(prismaMock.membership.createMany).toHaveBeenCalledWith({
        data: [
          {
            createdAt: expect.any(Date),
            teamId: 1,
            userId: 1,
            accepted: true,
            role: MembershipRole.MEMBER,
          },
          {
            createdAt: expect.any(Date),
            teamId: 2,
            userId: 1,
            accepted: true,
            role: MembershipRole.MEMBER,
          },
        ],
      });

      expect(prismaMock.membership.createMany).toHaveBeenCalledWith({
        data: [
          {
            createdAt: expect.any(Date),
            teamId: 1,
            userId: 2,
            accepted: false,
            role: MembershipRole.MEMBER,
          },
        ],
      });
    });

    it("should handle empty arrays of users", async () => {
      await MembershipRepository.createBulkMembershipsForTeam({
        teamId: 1,
        autoJoinUsers: [],
        regularUsers: [],
        parentId: null,
      });

      expect(prismaMock.membership.createMany).not.toHaveBeenCalled();
    });
  });

  describe("createBulkMembershipsForOrganization", () => {
    it("should create memberships for organization users", async () => {
      const mockInvitableUsers = [
        {
          id: 1,
          email: "user1@example.com",
          newRole: MembershipRole.MEMBER,
        },
        {
          id: 2,
          email: "user2@example.com",
          newRole: MembershipRole.ADMIN,
        },
      ];

      const mockOrgConnectInfo = {
        "user1@example.com": { orgId: 1, autoAccept: true },
        "user2@example.com": { orgId: 1, autoAccept: false },
      };

      await MembershipRepository.createBulkMembershipsForOrganization({
        organizationId: 1,
        invitableUsers: mockInvitableUsers,
        orgConnectInfoByUsernameOrEmail: mockOrgConnectInfo,
      });

      expect(prismaMock.membership.create).toHaveBeenCalledWith({
        data: {
          createdAt: expect.any(Date),
          userId: 1,
          teamId: 1,
          accepted: true,
          role: MembershipRole.MEMBER,
        },
      });

      expect(prismaMock.membership.create).toHaveBeenCalledWith({
        data: {
          createdAt: expect.any(Date),
          userId: 2,
          teamId: 1,
          accepted: false,
          role: MembershipRole.ADMIN,
        },
      });
    });
  });
});
