import { describe, it, expect, vi, beforeEach } from "vitest";

import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import { getUserEventGroups } from "../getUserEventGroups.handler";

// Mock dependencies
vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({
  checkRateLimitAndThrowError: vi.fn(),
}));

vi.mock("@calcom/features/membership/repositories/MembershipRepository", () => ({
  MembershipRepository: {
    findAllByUpIdIncludeTeam: vi.fn(),
  },
}));

vi.mock("@calcom/features/profile/repositories/ProfileRepository", () => ({
  ProfileRepository: {
    findByUpId: vi.fn(),
  },
}));

const mockFilterTeamsByEventTypeReadPermission = vi.fn();

vi.mock("../teamAccessUseCase", () => ({
  TeamAccessUseCase: vi.fn().mockImplementation(() => ({
    filterTeamsByEventTypeReadPermission: mockFilterTeamsByEventTypeReadPermission,
  })),
}));

vi.mock("@calcom/features/ee/organizations/lib/getBookerUrlServer", () => ({
  getBookerBaseUrl: vi.fn().mockResolvedValue("https://cal.com"),
}));

vi.mock("@calcom/features/ee/organizations/lib/getBookerBaseUrlSync", () => ({
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
  } as unknown as NonNullable<Parameters<typeof getUserEventGroups>[0]["ctx"]["user"]>;

  const mockProfile = {
    id: 1,
    username: "testuser",
    name: "Test User",
    avatarUrl: null,
    organizationId: null,
    organization: null,
  } as unknown as NonNullable<
    Awaited<
      ReturnType<
        typeof import("@calcom/features/profile/repositories/ProfileRepository").ProfileRepository.findByUpId
      >
    >
  >;

  const mockCtx = {
    user: mockUser,
    prisma: {} as PrismaClient,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic functionality", () => {
    it("should throw TRPCError when profile is not found", async () => {
      const { ProfileRepository } = await import("@calcom/features/profile/repositories/ProfileRepository");
      vi.mocked(ProfileRepository.findByUpId).mockResolvedValue(null);

      await expect(
        getUserEventGroups({
          ctx: mockCtx,
          input: null,
        })
      ).rejects.toThrow(TRPCError);
    });

    it("should return user event groups when no filters are applied", async () => {
      const { ProfileRepository } = await import("@calcom/features/profile/repositories/ProfileRepository");
      const { MembershipRepository } = await import(
        "@calcom/features/membership/repositories/MembershipRepository"
      );

      vi.mocked(ProfileRepository.findByUpId).mockResolvedValue(mockProfile);
      vi.mocked(MembershipRepository.findAllByUpIdIncludeTeam).mockResolvedValue([]);
      mockFilterTeamsByEventTypeReadPermission.mockResolvedValue([]);

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

  describe("Team memberships", () => {
    it("should include team events when team memberships exist", async () => {
      const { ProfileRepository } = await import("@calcom/features/profile/repositories/ProfileRepository");
      const { MembershipRepository } = await import(
        "@calcom/features/membership/repositories/MembershipRepository"
      );
      const { getResourcePermissions } = await import("@calcom/features/pbac/lib/resource-permissions");

      const mockTeamMembership = {
        id: 1,
        teamId: 100,
        userId: 1,
        accepted: true,
        role: MembershipRole.MEMBER,
        customRoleId: null,
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        team: {
          id: 100,
          name: "Test Team",
          slug: "test-team",
          logoUrl: null,
          parentId: null,
          parent: null,
          metadata: {},
        },
      } as unknown as NonNullable<
        Awaited<
          ReturnType<
            typeof import("@calcom/features/membership/repositories/MembershipRepository").MembershipRepository.findAllByUpIdIncludeTeam
          >
        >
      >[0];

      vi.mocked(ProfileRepository.findByUpId).mockResolvedValue(mockProfile);
      vi.mocked(MembershipRepository.findAllByUpIdIncludeTeam).mockResolvedValue([mockTeamMembership]);
      mockFilterTeamsByEventTypeReadPermission.mockResolvedValue([mockTeamMembership]);

      vi.mocked(getResourcePermissions).mockResolvedValue({
        canCreate: false,
        canEdit: true,
        canDelete: false,
        canRead: true,
      });

      const result = await getUserEventGroups({
        ctx: mockCtx,
        input: null,
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
      const { ProfileRepository } = await import("@calcom/features/profile/repositories/ProfileRepository");
      const { MembershipRepository } = await import(
        "@calcom/features/membership/repositories/MembershipRepository"
      );
      const { getResourcePermissions } = await import("@calcom/features/pbac/lib/resource-permissions");

      const mockTeamMembership = {
        id: 1,
        teamId: 100,
        userId: 1,
        accepted: true,
        role: MembershipRole.ADMIN,
        customRoleId: null,
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        team: {
          id: 100,
          name: "Test Team",
          slug: "test-team",
          logoUrl: null,
          parentId: null,
          parent: null,
          metadata: {},
        },
      } as unknown as NonNullable<
        Awaited<
          ReturnType<
            typeof import("@calcom/features/membership/repositories/MembershipRepository").MembershipRepository.findAllByUpIdIncludeTeam
          >
        >
      >[0];

      vi.mocked(ProfileRepository.findByUpId).mockResolvedValue(mockProfile);
      vi.mocked(MembershipRepository.findAllByUpIdIncludeTeam).mockResolvedValue([mockTeamMembership]);
      mockFilterTeamsByEventTypeReadPermission.mockResolvedValue([mockTeamMembership]);

      vi.mocked(getResourcePermissions).mockResolvedValue({
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canRead: true,
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
      const { ProfileRepository } = await import("@calcom/features/profile/repositories/ProfileRepository");
      const { MembershipRepository } = await import(
        "@calcom/features/membership/repositories/MembershipRepository"
      );
      const { getResourcePermissions } = await import("@calcom/features/pbac/lib/resource-permissions");

      const mockTeamMembership = {
        id: 1,
        teamId: 100,
        userId: 1,
        accepted: true,
        role: MembershipRole.MEMBER,
        customRoleId: null,
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        team: {
          id: 100,
          name: "Test Team",
          slug: "test-team",
          logoUrl: null,
          parentId: null,
          parent: null,
          metadata: {},
        },
      } as unknown as NonNullable<
        Awaited<
          ReturnType<
            typeof import("@calcom/features/membership/repositories/MembershipRepository").MembershipRepository.findAllByUpIdIncludeTeam
          >
        >
      >[0];

      vi.mocked(ProfileRepository.findByUpId).mockResolvedValue(mockProfile);
      vi.mocked(MembershipRepository.findAllByUpIdIncludeTeam).mockResolvedValue([mockTeamMembership]);
      mockFilterTeamsByEventTypeReadPermission.mockResolvedValue([mockTeamMembership]);

      vi.mocked(getResourcePermissions).mockRejectedValue(new Error("PBAC failed"));

      const result = await getUserEventGroups({
        ctx: mockCtx,
        input: null,
      });

      // Member role should not have create/update/delete permissions
      expect(result.profiles[1]).toMatchObject({
        canCreateEventTypes: false,
        canUpdateEventTypes: false,
      });
    });
  });

  describe("Organization handling", () => {
    it("should handle organization locked event types", async () => {
      const { ProfileRepository } = await import("@calcom/features/profile/repositories/ProfileRepository");
      const { MembershipRepository } = await import(
        "@calcom/features/membership/repositories/MembershipRepository"
      );

      const mockProfileWithOrg = {
        ...mockProfile,
        organization: {
          organizationSettings: {
            lockEventTypeCreationForUsers: true,
          },
        },
      } as unknown as NonNullable<
        Awaited<
          ReturnType<
            typeof import("@calcom/features/profile/repositories/ProfileRepository").ProfileRepository.findByUpId
          >
        >
      >;

      vi.mocked(ProfileRepository.findByUpId).mockResolvedValue(mockProfileWithOrg);
      vi.mocked(MembershipRepository.findAllByUpIdIncludeTeam).mockResolvedValue([]);
      mockFilterTeamsByEventTypeReadPermission.mockResolvedValue([]);

      const result = await getUserEventGroups({
        ctx: mockCtx,
        input: null,
      });

      expect(result.eventTypeGroups[0].profile.eventTypesLockedByOrg).toBe(true);
    });
  });

  describe("Routing forms", () => {
    it("should handle routing forms slug format", async () => {
      const { ProfileRepository } = await import("@calcom/features/profile/repositories/ProfileRepository");
      const { MembershipRepository } = await import(
        "@calcom/features/membership/repositories/MembershipRepository"
      );
      const { getResourcePermissions } = await import("@calcom/features/pbac/lib/resource-permissions");

      const mockTeamMembership = {
        id: 1,
        teamId: 100,
        userId: 1,
        accepted: true,
        role: MembershipRole.MEMBER,
        customRoleId: null,
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        team: {
          id: 100,
          name: "Test Team",
          slug: "test-team",
          logoUrl: null,
          parentId: null,
          parent: null,
          metadata: {},
        },
      } as unknown as NonNullable<
        Awaited<
          ReturnType<
            typeof import("@calcom/features/membership/repositories/MembershipRepository").MembershipRepository.findAllByUpIdIncludeTeam
          >
        >
      >[0];

      vi.mocked(ProfileRepository.findByUpId).mockResolvedValue(mockProfile);
      vi.mocked(MembershipRepository.findAllByUpIdIncludeTeam).mockResolvedValue([mockTeamMembership]);
      mockFilterTeamsByEventTypeReadPermission.mockResolvedValue([mockTeamMembership]);

      vi.mocked(getResourcePermissions).mockResolvedValue({
        canCreate: false,
        canEdit: true,
        canDelete: false,
        canRead: true,
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
