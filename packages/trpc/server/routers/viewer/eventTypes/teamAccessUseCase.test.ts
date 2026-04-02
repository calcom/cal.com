import { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamAccessUseCase } from "./teamAccessUseCase";

// Mock the PermissionCheckService
vi.mock("@calcom/features/pbac/services/permission-check.service", () => ({
  PermissionCheckService: vi.fn().mockImplementation(function () {
    return {
      checkPermission: vi.fn(),
    };
  }),
}));

describe("TeamAccessUseCase", () => {
  let teamAccessUseCase: TeamAccessUseCase;
  let mockCheckPermission: any;

  beforeEach(() => {
    vi.clearAllMocks();
    teamAccessUseCase = new TeamAccessUseCase();
    mockCheckPermission = (teamAccessUseCase as any).permissionCheckService.checkPermission;
  });

  describe("filterTeamsByEventTypeReadPermission", () => {
    const createMockMembership = (teamId: number, isOrganization = false) => ({
      id: teamId * 100,
      teamId,
      userId: 1,
      accepted: true,
      role: MembershipRole.MEMBER,
      disableImpersonation: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      customRoleId: null,
      team: {
        id: teamId,
        name: `Team ${teamId}`,
        slug: `team-${teamId}`,
        logoUrl: null,
        isOrganization,
        parentId: isOrganization ? null : 1,
        metadata: {},
        theme: null,
        brandColor: null,
        darkBrandColor: null,
        bio: null,
        hideBranding: false,
        hideBookATeamMember: false,
        isPrivate: false,
        parent: null,
        calVideoLogo: null,
        appLogo: null,
        appIconLogo: null,
        bannerUrl: null,
        timeFormat: null,
        timeZone: "UTC",
        weekStart: "Monday",
        createdAt: new Date(),
        pendingPayment: false,
        isPlatform: false,
        smsLockState: "UNLOCKED" as const,
        smsLockReviewedByAdmin: false,
        includeManagedEventsInLimits: false,
        bookingLimits: null,
        rrResetInterval: "MONTH" as const,
        rrTimestampBasis: "CREATED_AT" as const,
        createdByOAuthClientId: null,
        hideTeamProfileLink: false,
      },
    });

    it("should filter out organization memberships", async () => {
      const memberships = [
        createMockMembership(1, false),
        createMockMembership(2, true), // Organization
        createMockMembership(3, false),
      ];

      mockCheckPermission.mockResolvedValue(true);

      const result = await teamAccessUseCase.filterTeamsByEventTypeReadPermission(memberships as any, 1);

      expect(result).toHaveLength(2);
      expect(result.map((m) => m.teamId)).toEqual([1, 3]);
    });

    it("should filter out teams without eventType.read permission when PBAC is enabled", async () => {
      const memberships = [
        createMockMembership(1, false),
        createMockMembership(2, false),
        createMockMembership(3, false),
      ];

      mockCheckPermission
        .mockResolvedValueOnce(true) // Team 1 has permission
        .mockResolvedValueOnce(false) // Team 2 does not have permission
        .mockResolvedValueOnce(true); // Team 3 has permission

      const result = await teamAccessUseCase.filterTeamsByEventTypeReadPermission(memberships as any, 1);

      expect(result).toHaveLength(2);
      expect(result.map((m) => m.teamId)).toEqual([1, 3]);
      expect(mockCheckPermission).toHaveBeenCalledTimes(3);
      expect(mockCheckPermission).toHaveBeenCalledWith({
        userId: 1,
        teamId: 1,
        permission: "eventType.read",
        fallbackRoles: ["ADMIN", "OWNER", "MEMBER"],
      });
    });

    it("should return all non-organization teams when PBAC returns true for all", async () => {
      const memberships = [createMockMembership(1, false), createMockMembership(2, false)];

      mockCheckPermission.mockResolvedValue(true);

      const result = await teamAccessUseCase.filterTeamsByEventTypeReadPermission(memberships as any, 1);

      expect(result).toHaveLength(2);
      expect(result).toEqual(memberships);
    });

    it("should return empty array when no teams have permission", async () => {
      const memberships = [createMockMembership(1, false), createMockMembership(2, false)];

      mockCheckPermission.mockResolvedValue(false);

      const result = await teamAccessUseCase.filterTeamsByEventTypeReadPermission(memberships as any, 1);

      expect(result).toHaveLength(0);
    });
  });
});
