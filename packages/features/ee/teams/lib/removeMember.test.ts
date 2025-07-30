import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

// Import after mocks
import removeMember from "./removeMember";

// Mock dependencies
vi.mock("@calcom/prisma", () => ({
  default: {
    membership: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tempOrgRedirect: {
      deleteMany: vi.fn(),
    },
    host: {
      deleteMany: vi.fn(),
    },
    eventType: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@calcom/lib/server/repository/profile", () => ({
  ProfileRepository: {
    findByUserIdAndOrgId: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("./deleteWorkflowRemindersOfRemovedMember", () => ({
  deleteWorkfowRemindersOfRemovedMember: vi.fn(),
}));

describe("removeMember", () => {
  const mockMemberId = 123;
  const mockTeamId = 456;
  const mockOrgId = 789;

  const mockMembership = {
    userId: mockMemberId,
    teamId: mockTeamId,
    user: {},
    team: {},
  };

  const mockTeam = {
    id: mockTeamId,
    isOrganization: true,
    organizationSettings: {},
    metadata: {},
    activeOrgWorkflows: [],
    parentId: null,
  };

  const mockUser = {
    id: mockMemberId,
    username: "testuser",
    email: "test@example.com",
    movedToProfileId: null,
    completedOnboarding: true,
    teams: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default successful responses
    vi.mocked(prisma.membership.findUnique).mockResolvedValue(mockMembership);
    vi.mocked(prisma.team.findUnique).mockResolvedValue(mockTeam);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(prisma.$transaction).mockImplementation(async (operations) => {
      // Execute each operation
      return Promise.all(operations);
    });
    vi.mocked(ProfileRepository.findByUserIdAndOrgId).mockResolvedValue(null);
  });

  describe("error handling", () => {
    it("should throw NOT_FOUND error if membership doesn't exist", async () => {
      vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);

      await expect(
        removeMember({ memberId: mockMemberId, teamId: mockTeamId, isOrg: false })
      ).rejects.toThrow(TRPCError);
    });

    it("should throw NOT_FOUND error if team doesn't exist", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue(null);

      await expect(
        removeMember({ memberId: mockMemberId, teamId: mockTeamId, isOrg: false })
      ).rejects.toThrow(TRPCError);
    });

    it("should throw NOT_FOUND error if user doesn't exist", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        removeMember({ memberId: mockMemberId, teamId: mockTeamId, isOrg: false })
      ).rejects.toThrow(TRPCError);
    });
  });
});
