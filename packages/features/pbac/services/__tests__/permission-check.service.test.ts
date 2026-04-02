import { prisma } from "@calcom/prisma/__mocks__/prisma";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { IPermissionRepository } from "../../domain/repositories/IPermissionRepository";
import type { PermissionString } from "../../domain/types/permission-registry";
import { Resource } from "../../domain/types/permission-registry";
import type { PermissionService } from "../permission.service";
import { PermissionCheckService } from "../permission-check.service";

vi.mock("../../infrastructure/repositories/PermissionRepository");
vi.mock("@calcom/features/flags/features.repository");
vi.mock("@calcom/features/membership/repositories/MembershipRepository");
vi.mock("../permission.service");

vi.mock("@calcom/prisma", () => ({
  prisma,
}));

type MockRepository = {
  [K in keyof IPermissionRepository]: Mock;
};

describe("PermissionCheckService", () => {
  let service: PermissionCheckService;
  let mockRepository: MockRepository;
  let mockFeaturesRepository: { checkIfTeamHasFeature: Mock };
  let mockPermissionService: { validatePermission: Mock; validatePermissions: Mock };
  let mockMembershipRepository: { findUniqueByUserIdAndTeamId: Mock };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      getMembershipByMembershipId: vi.fn(),
      getMembershipByUserAndTeam: vi.fn(),
      getOrgMembership: vi.fn(),
      getTeamById: vi.fn(),
      getUserMemberships: vi.fn(),
      checkRolePermission: vi.fn(),
      checkRolePermissions: vi.fn(),
      getResourcePermissions: vi.fn(),
      getResourcePermissionsByRoleId: vi.fn(),
      getTeamIdsWithPermission: vi.fn(),
      getTeamIdsWithPermissions: vi.fn(),
    } as MockRepository;

    mockFeaturesRepository = {
      checkIfTeamHasFeature: vi.fn(),
    };

    mockPermissionService = {
      validatePermission: vi.fn().mockReturnValue({ isValid: true }),
      validatePermissions: vi.fn().mockReturnValue({ isValid: true }),
    };

    mockMembershipRepository = {
      findUniqueByUserIdAndTeamId: vi.fn(),
    };

    service = new PermissionCheckService(
      mockRepository,
      mockFeaturesRepository as unknown as FeaturesRepository,
      mockPermissionService as unknown as PermissionService,
      mockMembershipRepository as unknown as MembershipRepository
    );
  });

  describe("checkPermission", () => {
    it("should check permission with PBAC enabled", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByUserAndTeam.mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: "admin_role",
        team: { parentId: null },
      });
      mockRepository.checkRolePermission.mockResolvedValueOnce(true);

      const result = await service.checkPermission({
        userId: 1,
        teamId: 1,
        permission: "eventType.create",
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(true);
      expect(mockFeaturesRepository.checkIfTeamHasFeature).toHaveBeenCalledWith(1, "pbac");
      expect(mockRepository.getMembershipByUserAndTeam).toHaveBeenCalledWith(1, 1);
      expect(mockRepository.checkRolePermission).toHaveBeenCalledWith("admin_role", "eventType.create");
    });

    it("should check permission with PBAC disabled (fallback to roles)", async () => {
      const membership = {
        id: 1,
        teamId: 1,
        userId: 1,
        accepted: true,
        role: "ADMIN" as MembershipRole,
        customRoleId: "admin_role",
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValueOnce(membership);
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(false);

      const result = await service.checkPermission({
        userId: 1,
        teamId: 1,
        permission: "eventType.create",
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(true);
      expect(mockMembershipRepository.findUniqueByUserIdAndTeamId).toHaveBeenCalledWith({
        userId: 1,
        teamId: 1,
      });
      expect(mockFeaturesRepository.checkIfTeamHasFeature).toHaveBeenCalledWith(1, "pbac");
      expect(mockRepository.checkRolePermission).not.toHaveBeenCalled();
    });

    it("should return false if no team or org membership found when PBAC disabled", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(false);
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue(null);
      mockRepository.getTeamById.mockResolvedValueOnce({ id: 1, parentId: 100 });

      const result = await service.checkPermission({
        userId: 1,
        teamId: 1,
        permission: "eventType.create",
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(false);
      expect(mockMembershipRepository.findUniqueByUserIdAndTeamId).toHaveBeenCalledTimes(2);
    });

    it("should use org membership when team membership not found (PBAC disabled)", async () => {
      const orgMembership = {
        id: 2,
        teamId: 100,
        userId: 1,
        accepted: true,
        role: "ADMIN" as MembershipRole,
        customRoleId: null,
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(false);
      mockMembershipRepository.findUniqueByUserIdAndTeamId
        .mockResolvedValueOnce(null) // No team membership
        .mockResolvedValueOnce(orgMembership); // Has org membership
      mockRepository.getTeamById.mockResolvedValueOnce({ id: 1, parentId: 100 });

      const result = await service.checkPermission({
        userId: 1,
        teamId: 1,
        permission: "eventType.create",
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(true);
      expect(mockRepository.getTeamById).toHaveBeenCalledWith(1);
      expect(mockMembershipRepository.findUniqueByUserIdAndTeamId).toHaveBeenNthCalledWith(1, {
        userId: 1,
        teamId: 1,
      });
      expect(mockMembershipRepository.findUniqueByUserIdAndTeamId).toHaveBeenNthCalledWith(2, {
        userId: 1,
        teamId: 100,
      });
    });

    it("should use highest role when user is MEMBER of sub team but ADMIN of parent org (PBAC disabled)", async () => {
      const teamMembership = {
        id: 1,
        teamId: 1,
        userId: 1,
        accepted: true,
        role: "MEMBER" as MembershipRole,
        customRoleId: null,
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const orgMembership = {
        id: 2,
        teamId: 100,
        userId: 1,
        accepted: true,
        role: "ADMIN" as MembershipRole,
        customRoleId: null,
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(false);
      mockMembershipRepository.findUniqueByUserIdAndTeamId
        .mockResolvedValueOnce(teamMembership) // Has team membership as MEMBER
        .mockResolvedValueOnce(orgMembership); // Has org membership as ADMIN
      mockRepository.getTeamById.mockResolvedValueOnce({ id: 1, parentId: 100 });

      const result = await service.checkPermission({
        userId: 1,
        teamId: 1,
        permission: "eventType.update",
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(true);
      expect(mockRepository.getTeamById).toHaveBeenCalledWith(1);
      expect(mockMembershipRepository.findUniqueByUserIdAndTeamId).toHaveBeenNthCalledWith(1, {
        userId: 1,
        teamId: 1,
      });
      expect(mockMembershipRepository.findUniqueByUserIdAndTeamId).toHaveBeenNthCalledWith(2, {
        userId: 1,
        teamId: 100,
      });
    });

    it("should check org-level permissions when user is MEMBER of sub team but ADMIN of parent org (PBAC enabled)", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByUserAndTeam.mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: "team_member_role",
        team: { id: 1, parentId: 100 },
      });
      mockRepository.getOrgMembership.mockResolvedValueOnce({
        id: 2,
        teamId: 100,
        userId: 1,
        customRoleId: "org_admin_role",
      });
      mockRepository.checkRolePermission
        .mockResolvedValueOnce(false) // Team member role doesn't have permission
        .mockResolvedValueOnce(true); // Org admin role has permission

      const result = await service.checkPermission({
        userId: 1,
        teamId: 1,
        permission: "eventType.update",
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(true);
      expect(mockRepository.getMembershipByUserAndTeam).toHaveBeenCalledWith(1, 1);
      expect(mockRepository.getOrgMembership).toHaveBeenCalledWith(1, 100);
      expect(mockRepository.checkRolePermission).toHaveBeenNthCalledWith(
        1,
        "team_member_role",
        "eventType.update"
      );
      expect(mockRepository.checkRolePermission).toHaveBeenNthCalledWith(
        2,
        "org_admin_role",
        "eventType.update"
      );
    });

    it("should check org-level permissions when user has no team membership but PBAC is enabled", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByUserAndTeam.mockResolvedValueOnce(null);
      mockRepository.getTeamById.mockResolvedValueOnce({ id: 1, parentId: 2 });
      mockRepository.getOrgMembership.mockResolvedValueOnce({
        id: 100,
        teamId: 2,
        userId: 1,
        customRoleId: "org_admin_role",
      });
      mockRepository.checkRolePermission.mockResolvedValueOnce(true);

      const result = await service.checkPermission({
        userId: 1,
        teamId: 1,
        permission: "eventType.create",
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(true);
      expect(mockRepository.getMembershipByUserAndTeam).toHaveBeenCalledWith(1, 1);
      expect(mockRepository.getTeamById).toHaveBeenCalledWith(1);
      expect(mockRepository.getOrgMembership).toHaveBeenCalledWith(1, 2);
      expect(mockRepository.checkRolePermission).toHaveBeenCalledWith("org_admin_role", "eventType.create");
    });

    it("should return false if PBAC enabled but no customRoleId on team or org", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByUserAndTeam.mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: null,
        team: { parentId: 2 },
      });
      mockRepository.getOrgMembership.mockResolvedValueOnce({
        id: 100,
        teamId: 2,
        userId: 1,
        customRoleId: null,
      });

      const result = await service.checkPermission({
        userId: 1,
        teamId: 1,
        permission: "eventType.create",
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(false);
    });
  });

  describe("checkPermissions", () => {
    it("should check multiple permissions with PBAC enabled", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByUserAndTeam.mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: "admin_role",
        team: { parentId: null },
      });
      mockRepository.checkRolePermissions.mockResolvedValueOnce(true);

      const result = await service.checkPermissions({
        userId: 1,
        teamId: 1,
        permissions: ["eventType.create", "team.invite"],
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(true);
      expect(mockFeaturesRepository.checkIfTeamHasFeature).toHaveBeenCalledWith(1, "pbac");
      expect(mockRepository.getMembershipByUserAndTeam).toHaveBeenCalledWith(1, 1);
      expect(mockRepository.checkRolePermissions).toHaveBeenCalledWith("admin_role", [
        "eventType.create",
        "team.invite",
      ]);
    });

    it("should check multiple permissions with PBAC disabled (fallback to roles)", async () => {
      const membership = {
        id: 1,
        teamId: 1,
        userId: 1,
        accepted: true,
        role: "ADMIN" as MembershipRole,
        customRoleId: "admin_role",
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValueOnce(membership);
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(false);

      const result = await service.checkPermissions({
        userId: 1,
        teamId: 1,
        permissions: ["eventType.create", "team.invite"],
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(true);
      expect(mockMembershipRepository.findUniqueByUserIdAndTeamId).toHaveBeenCalledWith({
        userId: 1,
        teamId: 1,
      });
      expect(mockFeaturesRepository.checkIfTeamHasFeature).toHaveBeenCalledWith(1, "pbac");
      expect(mockRepository.checkRolePermissions).not.toHaveBeenCalled();
    });

    it("should use org membership for checkPermissions when team membership not found (PBAC disabled)", async () => {
      const orgMembership = {
        id: 2,
        teamId: 100,
        userId: 1,
        accepted: true,
        role: "ADMIN" as MembershipRole,
        customRoleId: null,
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(false);
      mockMembershipRepository.findUniqueByUserIdAndTeamId
        .mockResolvedValueOnce(null) // No team membership
        .mockResolvedValueOnce(orgMembership); // Has org membership
      mockRepository.getTeamById.mockResolvedValueOnce({ id: 1, parentId: 100 });

      const result = await service.checkPermissions({
        userId: 1,
        teamId: 1,
        permissions: ["eventType.create", "team.invite"],
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(true);
      expect(mockRepository.getTeamById).toHaveBeenCalledWith(1);
      expect(mockMembershipRepository.findUniqueByUserIdAndTeamId).toHaveBeenNthCalledWith(1, {
        userId: 1,
        teamId: 1,
      });
      expect(mockMembershipRepository.findUniqueByUserIdAndTeamId).toHaveBeenNthCalledWith(2, {
        userId: 1,
        teamId: 100,
      });
    });

    it("should return false when permissions array is empty", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByUserAndTeam.mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: "admin_role",
        team: { parentId: null },
      });
      mockRepository.getOrgMembership.mockResolvedValueOnce(null);
      mockRepository.checkRolePermissions.mockResolvedValueOnce(false);

      const result = await service.checkPermissions({
        userId: 1,
        teamId: 1,
        permissions: [],
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(false);
      expect(mockRepository.checkRolePermissions).toHaveBeenCalledWith("admin_role", []);
    });

    it("should check org-level permissions when user has no team membership with checkPermissions", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByUserAndTeam.mockResolvedValueOnce(null);
      mockRepository.getTeamById.mockResolvedValueOnce({ id: 1, parentId: 2 });
      mockRepository.getOrgMembership.mockResolvedValueOnce({
        id: 100,
        teamId: 2,
        userId: 1,
        customRoleId: "org_admin_role",
      });
      mockRepository.checkRolePermissions.mockResolvedValueOnce(true);

      const result = await service.checkPermissions({
        userId: 1,
        teamId: 1,
        permissions: ["eventType.create", "team.invite"],
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(true);
      expect(mockRepository.getMembershipByUserAndTeam).toHaveBeenCalledWith(1, 1);
      expect(mockRepository.getTeamById).toHaveBeenCalledWith(1);
      expect(mockRepository.getOrgMembership).toHaveBeenCalledWith(1, 2);
      expect(mockRepository.checkRolePermissions).toHaveBeenCalledWith("org_admin_role", [
        "eventType.create",
        "team.invite",
      ]);
    });
  });

  describe("getUserPermissions", () => {
    it("should return user memberships", async () => {
      const memberships = [
        {
          teamId: 1,
          userId: 1,
          role: "ADMIN" as MembershipRole,
          accepted: true,
        },
      ];

      mockRepository.getUserMemberships.mockResolvedValueOnce(memberships);

      const result = await service.getUserPermissions(1);
      expect(result).toEqual(memberships);
      expect(mockRepository.getUserMemberships).toHaveBeenCalledWith(1);
    });
  });

  describe("getTeamIdsWithPermission", () => {
    it("should return team IDs where user has the specified permission", async () => {
      const expectedTeamIds = [1, 2, 3];
      mockRepository.getTeamIdsWithPermission.mockResolvedValueOnce(expectedTeamIds);

      const result = await service.getTeamIdsWithPermission({
        userId: 1,
        permission: "eventType.read",
        fallbackRoles: [],
      });

      expect(result).toEqual(expectedTeamIds);
      expect(mockRepository.getTeamIdsWithPermission).toHaveBeenCalledWith({
        userId: 1,
        permission: "eventType.read",
        fallbackRoles: [],
      });
    });

    it("should return empty array when permission validation fails", async () => {
      mockPermissionService.validatePermission.mockReturnValueOnce({
        isValid: false,
        error: "Invalid permissions",
      });

      const result = await service.getTeamIdsWithPermission({
        userId: 1,
        permission: "eventType.read",
        fallbackRoles: [],
      });

      expect(result).toEqual([]);
      expect(mockRepository.getTeamIdsWithPermission).not.toHaveBeenCalled();
    });

    it("should return empty array and log error when repository throws", async () => {
      mockRepository.getTeamIdsWithPermission.mockRejectedValueOnce(new Error("Database error"));

      const result = await service.getTeamIdsWithPermission({
        userId: 1,
        permission: "eventType.read",
        fallbackRoles: [],
      });

      expect(result).toEqual([]);
      expect(mockRepository.getTeamIdsWithPermission).toHaveBeenCalledWith({
        userId: 1,
        permission: "eventType.read",
        fallbackRoles: [],
      });
    });

    it("should include child teams where user has org-level fallback roles", async () => {
      // User is ADMIN in org (teamId: 100) but MEMBER in child team (teamId: 1)
      // Should get access to child team via org-level ADMIN role
      const expectedTeamIds = [1, 100]; // Child team + org team
      mockRepository.getTeamIdsWithPermission.mockResolvedValueOnce(expectedTeamIds);

      const result = await service.getTeamIdsWithPermission({
        userId: 1,
        permission: "insights.read",
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toEqual(expectedTeamIds);
      expect(mockRepository.getTeamIdsWithPermission).toHaveBeenCalledWith({
        userId: 1,
        permission: "insights.read",
        fallbackRoles: ["ADMIN", "OWNER"],
      });
    });

    it("should include child teams where user has org-level PBAC permissions", async () => {
      // User has PBAC permission via custom role in org (teamId: 100) but not in child team (teamId: 1)
      // When PBAC is enabled, fallback roles are NOT used - only PBAC permissions matter
      // Should get access to child team via org-level PBAC permission
      const expectedTeamIds = [1, 100]; // Child team + org team
      mockRepository.getTeamIdsWithPermission.mockResolvedValueOnce(expectedTeamIds);

      const result = await service.getTeamIdsWithPermission({
        userId: 1,
        permission: "insights.read",
        fallbackRoles: [], // Empty fallback roles - PBAC permissions work independently when PBAC is enabled
      });

      expect(result).toEqual(expectedTeamIds);
      expect(mockRepository.getTeamIdsWithPermission).toHaveBeenCalledWith({
        userId: 1,
        permission: "insights.read",
        fallbackRoles: [], // Verify PBAC permissions work without fallback roles
      });
    });
  });

  describe("getTeamIdsWithPermissions", () => {
    it("should return team IDs where user has all specified permissions", async () => {
      const expectedTeamIds = [1, 2];
      const permissions: PermissionString[] = ["eventType.read", "eventType.create"];
      mockRepository.getTeamIdsWithPermissions.mockResolvedValueOnce(expectedTeamIds);

      const result = await service.getTeamIdsWithPermissions({ userId: 1, permissions, fallbackRoles: [] });

      expect(result).toEqual(expectedTeamIds);
      expect(mockRepository.getTeamIdsWithPermissions).toHaveBeenCalledWith({
        userId: 1,
        permissions,
        fallbackRoles: [],
      });
    });

    it("should return empty array when permissions validation fails", async () => {
      mockPermissionService.validatePermissions.mockReturnValueOnce({
        isValid: false,
        error: "Invalid permissions",
      });

      const result = await service.getTeamIdsWithPermissions({
        userId: 1,
        permissions: ["eventType.read"] as PermissionString[],
        fallbackRoles: [],
      });

      expect(result).toEqual([]);
      expect(mockRepository.getTeamIdsWithPermissions).not.toHaveBeenCalled();
    });

    it("should return empty array when permissions array is empty", async () => {
      mockRepository.getTeamIdsWithPermissions.mockResolvedValueOnce([]);

      const result = await service.getTeamIdsWithPermissions({
        userId: 1,
        permissions: [],
        fallbackRoles: [],
      });

      expect(result).toEqual([]);
      expect(mockRepository.getTeamIdsWithPermissions).toHaveBeenCalledWith({
        userId: 1,
        permissions: [],
        fallbackRoles: [],
      });
    });

    it("should return empty array and log error when repository throws", async () => {
      const permissions: PermissionString[] = ["eventType.read", "eventType.create"];
      mockRepository.getTeamIdsWithPermissions.mockRejectedValueOnce(new Error("Database error"));

      const result = await service.getTeamIdsWithPermissions({ userId: 1, permissions, fallbackRoles: [] });

      expect(result).toEqual([]);
      expect(mockRepository.getTeamIdsWithPermissions).toHaveBeenCalledWith({
        userId: 1,
        permissions,
        fallbackRoles: [],
      });
    });

    it("should include child teams where user has org-level fallback roles", async () => {
      // User is ADMIN in org (teamId: 100) but MEMBER in child team (teamId: 1)
      // Should get access to child team via org-level ADMIN role
      const permissions: PermissionString[] = ["insights.read", "insights.create"];
      const expectedTeamIds = [1, 2, 100]; // Child teams + org team
      mockRepository.getTeamIdsWithPermissions.mockResolvedValueOnce(expectedTeamIds);

      const result = await service.getTeamIdsWithPermissions({
        userId: 1,
        permissions,
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toEqual(expectedTeamIds);
      expect(mockRepository.getTeamIdsWithPermissions).toHaveBeenCalledWith({
        userId: 1,
        permissions,
        fallbackRoles: ["ADMIN", "OWNER"],
      });
    });

    it("should include child teams where user has org-level PBAC permissions", async () => {
      // User has PBAC permissions in org (teamId: 100) but not in child team (teamId: 1)
      // Should get access to child team via org-level PBAC permissions
      const permissions: PermissionString[] = ["insights.read", "insights.create"];
      const expectedTeamIds = [1, 2, 100]; // Child teams + org team
      mockRepository.getTeamIdsWithPermissions.mockResolvedValueOnce(expectedTeamIds);

      const result = await service.getTeamIdsWithPermissions({
        userId: 1,
        permissions,
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toEqual(expectedTeamIds);
      expect(mockRepository.getTeamIdsWithPermissions).toHaveBeenCalledWith({
        userId: 1,
        permissions,
        fallbackRoles: ["ADMIN", "OWNER"],
      });
    });
  });

  describe("getResourcePermissions", () => {
    it("should return org permissions when user has no team membership but has org membership", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByUserAndTeam.mockResolvedValueOnce(null);
      mockRepository.getTeamById.mockResolvedValueOnce({ id: 1, parentId: 2 });
      mockRepository.getOrgMembership.mockResolvedValueOnce({
        id: 100,
        teamId: 2,
        userId: 1,
        customRoleId: "org_role",
      });
      mockRepository.getResourcePermissionsByRoleId.mockResolvedValueOnce(["create", "read", "update"]);

      const result = await service.getResourcePermissions({
        userId: 1,
        teamId: 1,
        resource: Resource.EventType,
      });

      expect(result).toEqual(["eventType.create", "eventType.read", "eventType.update"]);
      expect(mockRepository.getMembershipByUserAndTeam).toHaveBeenCalledWith(1, 1);
      expect(mockRepository.getTeamById).toHaveBeenCalledWith(1);
      expect(mockRepository.getOrgMembership).toHaveBeenCalledWith(1, 2);
      expect(mockRepository.getResourcePermissionsByRoleId).toHaveBeenCalledWith(
        "org_role",
        Resource.EventType
      );
    });
    it("should return empty array when PBAC is disabled", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(false);

      const result = await service.getResourcePermissions({
        userId: 1,
        teamId: 1,
        resource: Resource.EventType,
      });

      expect(result).toEqual([]);
      expect(mockFeaturesRepository.checkIfTeamHasFeature).toHaveBeenCalledWith(1, "pbac");
      expect(mockRepository.getMembershipByUserAndTeam).not.toHaveBeenCalled();
    });

    it("should return team-level permissions when PBAC is enabled and no org membership", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByUserAndTeam.mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: "team_role",
        team: { parentId: null },
      });
      mockRepository.getOrgMembership.mockResolvedValueOnce(null);
      mockRepository.getResourcePermissionsByRoleId.mockResolvedValueOnce(["create", "read"]);

      const result = await service.getResourcePermissions({
        userId: 1,
        teamId: 1,
        resource: Resource.EventType,
      });

      expect(result).toEqual(["eventType.create", "eventType.read"]);
      expect(mockRepository.getMembershipByUserAndTeam).toHaveBeenCalledWith(1, 1);
      expect(mockRepository.getResourcePermissionsByRoleId).toHaveBeenCalledWith(
        "team_role",
        Resource.EventType
      );
      expect(mockRepository.getOrgMembership).not.toHaveBeenCalled();
    });

    it("should return only team permissions when team has no parentId", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByUserAndTeam.mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: "team_role",
        team: { parentId: null },
      });
      mockRepository.getResourcePermissionsByRoleId.mockResolvedValueOnce(["create", "read", "update"]);

      const result = await service.getResourcePermissions({
        userId: 1,
        teamId: 1,
        resource: Resource.EventType,
      });

      expect(result).toEqual(["eventType.create", "eventType.read", "eventType.update"]);
      expect(mockRepository.getMembershipByUserAndTeam).toHaveBeenCalledWith(1, 1);
      expect(mockRepository.getResourcePermissionsByRoleId).toHaveBeenCalledTimes(1);
      expect(mockRepository.getResourcePermissionsByRoleId).toHaveBeenCalledWith(
        "team_role",
        Resource.EventType
      );
      expect(mockRepository.getOrgMembership).not.toHaveBeenCalled();
    });

    it("should return combined team and org permissions when both exist", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByUserAndTeam.mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: "team_role",
        team: { parentId: 2 },
      });
      mockRepository.getOrgMembership.mockResolvedValueOnce({
        id: 2,
        teamId: 2,
        userId: 1,
        customRoleId: "org_role",
      });

      // Mock team permissions - create implies read
      mockRepository.getResourcePermissionsByRoleId
        .mockResolvedValueOnce(["create", "read"]) // team permissions
        .mockResolvedValueOnce(["update", "delete", "read"]); // org permissions - update/delete imply read

      const result = await service.getResourcePermissions({
        userId: 1,
        teamId: 1,
        resource: Resource.EventType,
      });

      expect(result).toEqual(["eventType.create", "eventType.read", "eventType.update", "eventType.delete"]);
      expect(mockRepository.getMembershipByUserAndTeam).toHaveBeenCalledWith(1, 1);
      expect(mockRepository.getOrgMembership).toHaveBeenCalledWith(1, 2);
      expect(mockRepository.getResourcePermissionsByRoleId).toHaveBeenCalledTimes(2);
      expect(mockRepository.getResourcePermissionsByRoleId).toHaveBeenNthCalledWith(
        1,
        "team_role",
        Resource.EventType
      );
      expect(mockRepository.getResourcePermissionsByRoleId).toHaveBeenNthCalledWith(
        2,
        "org_role",
        Resource.EventType
      );
    });

    it("should deduplicate permissions when team and org have overlapping permissions", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByUserAndTeam.mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: "team_role",
        team: { parentId: 2 },
      });
      mockRepository.getOrgMembership.mockResolvedValueOnce({
        id: 2,
        teamId: 2,
        userId: 1,
        customRoleId: "org_role",
      });

      // Mock overlapping permissions - both include read, update implies read
      mockRepository.getResourcePermissionsByRoleId
        .mockResolvedValueOnce(["create", "read"]) // team permissions - create implies read
        .mockResolvedValueOnce(["read", "update"]); // org permissions - update implies read, explicit read

      const result = await service.getResourcePermissions({
        userId: 1,
        teamId: 1,
        resource: Resource.EventType,
      });

      expect(result).toEqual(["eventType.create", "eventType.read", "eventType.update"]);
      expect(result).toHaveLength(3); // Should not have duplicate "read"
    });

    it("should return only org permissions when team has no custom role", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByUserAndTeam.mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: null,
        team: { parentId: 2 },
      });
      mockRepository.getOrgMembership.mockResolvedValueOnce({
        id: 2,
        teamId: 2,
        userId: 1,
        customRoleId: "org_role",
      });

      // Update and delete imply read access
      mockRepository.getResourcePermissionsByRoleId.mockResolvedValueOnce(["update", "delete", "read"]);

      const result = await service.getResourcePermissions({
        userId: 1,
        teamId: 1,
        resource: Resource.EventType,
      });

      expect(result).toEqual(["eventType.update", "eventType.delete", "eventType.read"]);
      expect(mockRepository.getResourcePermissionsByRoleId).toHaveBeenCalledTimes(1);
      expect(mockRepository.getResourcePermissionsByRoleId).toHaveBeenCalledWith(
        "org_role",
        Resource.EventType
      );
    });

    it("should return empty array when no membership found", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByUserAndTeam.mockResolvedValueOnce(null);

      const result = await service.getResourcePermissions({
        userId: 1,
        teamId: 1,
        resource: Resource.EventType,
      });

      expect(result).toEqual([]);
      expect(mockRepository.getResourcePermissionsByRoleId).not.toHaveBeenCalled();
    });

    it("should return empty array and log error when repository throws", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByUserAndTeam.mockRejectedValueOnce(new Error("Database error"));

      const result = await service.getResourcePermissions({
        userId: 1,
        teamId: 1,
        resource: Resource.EventType,
      });

      expect(result).toEqual([]);
    });

    it("should enforce correct hierarchy - org permissions should take precedence over team permissions", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByUserAndTeam.mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: "admin_team_role",
        team: { parentId: 2 },
      });
      mockRepository.getOrgMembership.mockResolvedValueOnce({
        id: 2,
        teamId: 2,
        userId: 1,
        customRoleId: "restricted_org_role",
      });

      // Team role has broad permissions - CUD actions include read
      // Org role has restricted permissions (only read)
      mockRepository.getResourcePermissionsByRoleId
        .mockResolvedValueOnce(["create", "read", "update"]) // team permissions - CRU
        .mockResolvedValueOnce(["delete"]); // org permissions - delete only

      const result = await service.getResourcePermissions({
        userId: 1,
        teamId: 1,
        resource: Resource.EventType,
      });

      // User gets eventType.delete because they have this in the org
      expect(result).toEqual(["eventType.create", "eventType.read", "eventType.update", "eventType.delete"]);

      // Verify both team and org permissions were fetched
      expect(mockRepository.getResourcePermissionsByRoleId).toHaveBeenCalledTimes(2);
      expect(mockRepository.getResourcePermissionsByRoleId).toHaveBeenNthCalledWith(
        1,
        "admin_team_role",
        Resource.EventType
      );
      expect(mockRepository.getResourcePermissionsByRoleId).toHaveBeenNthCalledWith(
        2,
        "restricted_org_role",
        Resource.EventType
      );
    });
  });
});
