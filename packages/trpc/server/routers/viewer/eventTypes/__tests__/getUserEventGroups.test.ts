import { describe, it, expect, vi, beforeEach } from "vitest";

import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import { getUserEventGroups } from "../getUserEventGroups.refactored";

// Mock dependencies
vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({
  checkRateLimitAndThrowError: vi.fn(),
}));

vi.mock("@calcom/lib/server/repository/membership", () => ({
  MembershipRepository: {
    findAllByUpIdIncludeTeam: vi.fn(),
  },
}));

vi.mock("@calcom/lib/server/repository/profile", () => ({
  ProfileRepository: {
    findByUpId: vi.fn(),
  },
}));

vi.mock("../teamAccessUseCase", () => ({
  TeamAccessUseCase: vi.fn().mockImplementation(() => ({
    filterTeamsByEventTypeReadPermission: vi.fn(),
  })),
}));

vi.mock("@calcom/lib/getBookerUrl/server", () => ({
  getBookerBaseUrl: vi.fn().mockResolvedValue("https://cal.com"),
}));

vi.mock("@calcom/lib/getBookerUrl/client", () => ({
  getBookerBaseUrlSync: vi.fn().mockReturnValue("https://cal.com"),
}));

vi.mock("@calcom/lib/getAvatarUrl", () => ({
  getUserAvatarUrl: vi.fn().mockReturnValue("https://avatar.com/user.jpg"),
}));

vi.mock("@calcom/lib/defaultAvatarImage", () => ({
  getPlaceholderAvatar: vi.fn().mockReturnValue("https://avatar.com/placeholder.jpg"),
}));

vi.mock("@calcom/features/pbac/lib/resource-permissions", () => ({
  getResourcePermissions: vi.fn(),
}));

describe("getUserEventGroups", () => {
  const mockUser = {
    id: 1,
    profile: {
      upId: "user-123",
    },
  };

  const mockProfile = {
    id: 1,
    username: "testuser",
    name: "Test User",
    avatarUrl: null,
    organizationId: null,
    organization: null,
  };

  const mockCtx = {
    user: mockUser,
    prisma: {} as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic functionality", () => {
    it("should throw TRPCError when profile is not found", async () => {
      const { ProfileRepository } = await import("@calcom/lib/server/repository/profile");
      vi.mocked(ProfileRepository.findByUpId).mockResolvedValue(null);

      await expect(
        getUserEventGroups({
          ctx: mockCtx,
          input: null,
        })
      ).rejects.toThrow(TRPCError);
    });

    it("should return user event groups when no filters are applied", async () => {
      const { ProfileRepository } = await import("@calcom/lib/server/repository/profile");
      const { MembershipRepository } = await import("@calcom/lib/server/repository/membership");
      const { TeamAccessUseCase } = await import("../teamAccessUseCase");

      vi.mocked(ProfileRepository.findByUpId).mockResolvedValue(mockProfile);
      vi.mocked(MembershipRepository.findAllByUpIdIncludeTeam).mockResolvedValue([]);

      const mockTeamAccessUseCase = new TeamAccessUseCase();
      vi.mocked(mockTeamAccessUseCase.filterTeamsByEventTypeReadPermission).mockResolvedValue([]);

      const result = await getUserEventGroups({
        ctx: mockCtx,
        input: null,
      });

      expect(result).toHaveProperty("eventTypeGroups");
      expect(result).toHaveProperty("profiles");
      expect(result.eventTypeGroups).toHaveLength(1);
      expect(result.eventTypeGroups[0]).toMatchObject({
        teamId: null,
        membershipRole: null,
        profile: {
          slug: "testuser",
          name: "Test User",
        },
      });
    });
  });

  describe("Filtering", () => {
    it("should filter user events when upId filter is applied and user is not included", async () => {
      const { ProfileRepository } = await import("@calcom/lib/server/repository/profile");
      const { MembershipRepository } = await import("@calcom/lib/server/repository/membership");
      const { TeamAccessUseCase } = await import("../teamAccessUseCase");

      vi.mocked(ProfileRepository.findByUpId).mockResolvedValue(mockProfile);
      vi.mocked(MembershipRepository.findAllByUpIdIncludeTeam).mockResolvedValue([]);

      const mockTeamAccessUseCase = new TeamAccessUseCase();
      vi.mocked(mockTeamAccessUseCase.filterTeamsByEventTypeReadPermission).mockResolvedValue([]);

      const result = await getUserEventGroups({
        ctx: mockCtx,
        input: {
          filters: {
            upIds: ["other-user-123"],
          },
        },
      });

      expect(result.eventTypeGroups).toHaveLength(1); // Should still include user events due to fallback logic
    });

    it("should include team events when teamIds filter matches", async () => {
      const { ProfileRepository } = await import("@calcom/lib/server/repository/profile");
      const { MembershipRepository } = await import("@calcom/lib/server/repository/membership");
      const { TeamAccessUseCase } = await import("../teamAccessUseCase");
      const { getResourcePermissions } = await import("@calcom/features/pbac/lib/resource-permissions");

      const mockTeamMembership = {
        id: 1,
        role: MembershipRole.MEMBER,
        team: {
          id: 100,
          name: "Test Team",
          slug: "test-team",
          logoUrl: null,
          parentId: null,
          parent: null,
          metadata: {},
        },
      };

      vi.mocked(ProfileRepository.findByUpId).mockResolvedValue(mockProfile);
      vi.mocked(MembershipRepository.findAllByUpIdIncludeTeam).mockResolvedValue([mockTeamMembership]);

      const mockTeamAccessUseCase = new TeamAccessUseCase();
      vi.mocked(mockTeamAccessUseCase.filterTeamsByEventTypeReadPermission).mockResolvedValue([
        mockTeamMembership,
      ]);

      vi.mocked(getResourcePermissions).mockResolvedValue({
        canCreate: false,
        canEdit: true,
        canDelete: false,
      });

      const result = await getUserEventGroups({
        ctx: mockCtx,
        input: {
          filters: {
            teamIds: [100],
          },
        },
      });

      expect(result.eventTypeGroups).toHaveLength(2); // User + Team
      expect(result.eventTypeGroups[1]).toMatchObject({
        teamId: 100,
        profile: {
          name: "Test Team",
          slug: "team/test-team",
        },
      });
    });
  });

  describe("Permissions", () => {
    it("should handle PBAC permissions correctly", async () => {
      const { ProfileRepository } = await import("@calcom/lib/server/repository/profile");
      const { MembershipRepository } = await import("@calcom/lib/server/repository/membership");
      const { TeamAccessUseCase } = await import("../teamAccessUseCase");
      const { getResourcePermissions } = await import("@calcom/features/pbac/lib/resource-permissions");

      const mockTeamMembership = {
        id: 1,
        role: MembershipRole.ADMIN,
        team: {
          id: 100,
          name: "Test Team",
          slug: "test-team",
          logoUrl: null,
          parentId: null,
          parent: null,
          metadata: {},
        },
      };

      vi.mocked(ProfileRepository.findByUpId).mockResolvedValue(mockProfile);
      vi.mocked(MembershipRepository.findAllByUpIdIncludeTeam).mockResolvedValue([mockTeamMembership]);

      const mockTeamAccessUseCase = new TeamAccessUseCase();
      vi.mocked(mockTeamAccessUseCase.filterTeamsByEventTypeReadPermission).mockResolvedValue([
        mockTeamMembership,
      ]);

      vi.mocked(getResourcePermissions).mockResolvedValue({
        canCreate: true,
        canEdit: true,
        canDelete: true,
      });

      const result = await getUserEventGroups({
        ctx: mockCtx,
        input: null,
      });

      expect(result.profiles[1]).toMatchObject({
        canCreateEventTypes: true,
        canUpdateEventTypes: true,
      });
    });

    it("should fallback to role-based permissions when PBAC fails", async () => {
      const { ProfileRepository } = await import("@calcom/lib/server/repository/profile");
      const { MembershipRepository } = await import("@calcom/lib/server/repository/membership");
      const { TeamAccessUseCase } = await import("../teamAccessUseCase");
      const { getResourcePermissions } = await import("@calcom/features/pbac/lib/resource-permissions");

      const mockTeamMembership = {
        id: 1,
        role: MembershipRole.MEMBER,
        team: {
          id: 100,
          name: "Test Team",
          slug: "test-team",
          logoUrl: null,
          parentId: null,
          parent: null,
          metadata: {},
        },
      };

      vi.mocked(ProfileRepository.findByUpId).mockResolvedValue(mockProfile);
      vi.mocked(MembershipRepository.findAllByUpIdIncludeTeam).mockResolvedValue([mockTeamMembership]);

      const mockTeamAccessUseCase = new TeamAccessUseCase();
      vi.mocked(mockTeamAccessUseCase.filterTeamsByEventTypeReadPermission).mockResolvedValue([
        mockTeamMembership,
      ]);

      vi.mocked(getResourcePermissions).mockRejectedValue(new Error("PBAC failed"));

      const result = await getUserEventGroups({
        ctx: mockCtx,
        input: null,
      });

      // Member role should have edit but not create/delete permissions
      expect(result.profiles[1]).toMatchObject({
        canCreateEventTypes: false,
        canUpdateEventTypes: true,
      });
    });
  });

  describe("Organization handling", () => {
    it("should handle organization locked event types", async () => {
      const { ProfileRepository } = await import("@calcom/lib/server/repository/profile");
      const { MembershipRepository } = await import("@calcom/lib/server/repository/membership");
      const { TeamAccessUseCase } = await import("../teamAccessUseCase");

      const mockProfileWithOrg = {
        ...mockProfile,
        organization: {
          organizationSettings: {
            lockEventTypeCreationForUsers: true,
          },
        },
      };

      vi.mocked(ProfileRepository.findByUpId).mockResolvedValue(mockProfileWithOrg);
      vi.mocked(MembershipRepository.findAllByUpIdIncludeTeam).mockResolvedValue([]);

      const mockTeamAccessUseCase = new TeamAccessUseCase();
      vi.mocked(mockTeamAccessUseCase.filterTeamsByEventTypeReadPermission).mockResolvedValue([]);

      const result = await getUserEventGroups({
        ctx: mockCtx,
        input: null,
      });

      expect(result.eventTypeGroups[0].profile.eventTypesLockedByOrg).toBe(true);
    });
  });

  describe("Routing forms", () => {
    it("should handle routing forms slug format", async () => {
      const { ProfileRepository } = await import("@calcom/lib/server/repository/profile");
      const { MembershipRepository } = await import("@calcom/lib/server/repository/membership");
      const { TeamAccessUseCase } = await import("../teamAccessUseCase");
      const { getResourcePermissions } = await import("@calcom/features/pbac/lib/resource-permissions");

      const mockTeamMembership = {
        id: 1,
        role: MembershipRole.MEMBER,
        team: {
          id: 100,
          name: "Test Team",
          slug: "test-team",
          logoUrl: null,
          parentId: null,
          parent: null,
          metadata: {},
        },
      };

      vi.mocked(ProfileRepository.findByUpId).mockResolvedValue(mockProfile);
      vi.mocked(MembershipRepository.findAllByUpIdIncludeTeam).mockResolvedValue([mockTeamMembership]);

      const mockTeamAccessUseCase = new TeamAccessUseCase();
      vi.mocked(mockTeamAccessUseCase.filterTeamsByEventTypeReadPermission).mockResolvedValue([
        mockTeamMembership,
      ]);

      vi.mocked(getResourcePermissions).mockResolvedValue({
        canCreate: false,
        canEdit: true,
        canDelete: false,
      });

      const result = await getUserEventGroups({
        ctx: mockCtx,
        input: {
          forRoutingForms: true,
        },
      });

      expect(result.eventTypeGroups[1].profile.slug).toBe("team/test-team");
    });
  });
});
