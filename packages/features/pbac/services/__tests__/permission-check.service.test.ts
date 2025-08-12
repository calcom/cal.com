import { vi, describe, it, expect, beforeEach } from "vitest";

import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { MembershipRepository } from "@calcom/lib/server/repository/membership";
import type { MembershipRole } from "@calcom/prisma/enums";

import type { IPermissionRepository } from "../../domain/repositories/IPermissionRepository";
import type { PermissionString } from "../../domain/types/permission-registry";
import { Resource } from "../../domain/types/permission-registry";
import { PermissionCheckService } from "../permission-check.service";
import type { PermissionService } from "../permission.service";

describe("PermissionCheckService", () => {
  let service: PermissionCheckService;
  let mockRepository: Partial<IPermissionRepository>;
  let mockFeaturesRepository: Partial<FeaturesRepository>;
  let mockPermissionService: Partial<PermissionService>;
  let mockMembershipRepository: Partial<MembershipRepository>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepository = {
      getMembershipByMembershipId: vi.fn(),
      getOrgMembership: vi.fn(),
      checkRolePermission: vi.fn(),
      checkRolePermissions: vi.fn(),
      getUserMemberships: vi.fn(),
      getTeamIdsWithPermission: vi.fn(),
      getTeamIdsWithPermissions: vi.fn(),
      getMembershipByUserAndTeam: vi.fn(),
      getResourcePermissionsByRoleId: vi.fn(),
    };
    mockFeaturesRepository = {
      checkIfTeamHasFeature: vi.fn(),
    };
    mockMembershipRepository = {
      findUniqueByUserIdAndTeamId: vi.fn(),
    };
    mockPermissionService = {
      validatePermission: vi.fn().mockReturnValue({ isValid: true }),
      validatePermissions: vi.fn().mockReturnValue({ isValid: true }),
    };

    service = new PermissionCheckService({
      repository: mockRepository as IPermissionRepository,
      membershipRepository: mockMembershipRepository as MembershipRepository,
      featuresRepository: mockFeaturesRepository as FeaturesRepository,
      permissionService: mockPermissionService as PermissionService,
    });
  });

  describe("checkPermission", () => {
    it("should check permission with PBAC enabled", async () => {
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

      vi.spyOn(mockMembershipRepository, "findUniqueByUserIdAndTeamId").mockResolvedValueOnce(membership);
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(true);
      vi.spyOn(mockRepository, "getMembershipByMembershipId").mockResolvedValueOnce({
        id: membership.id,
        teamId: membership.teamId,
        userId: membership.userId,
        customRoleId: membership.customRoleId,
        team: { parentId: null },
      });
      vi.spyOn(mockRepository, "getOrgMembership").mockResolvedValueOnce(null);
      vi.spyOn(mockRepository, "checkRolePermission").mockResolvedValueOnce(true);

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
      expect(mockRepository.getMembershipByMembershipId).toHaveBeenCalledWith(1);
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

      vi.spyOn(mockMembershipRepository, "findUniqueByUserIdAndTeamId").mockResolvedValueOnce(membership);
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(false);

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

    it("should return false if membership not found", async () => {
      vi.spyOn(mockMembershipRepository, "findUniqueByUserIdAndTeamId").mockResolvedValueOnce(null);

      const result = await service.checkPermission({
        userId: 1,
        teamId: 1,
        permission: "eventType.create",
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(false);
    });

    it("should return false if PBAC enabled but no customRoleId", async () => {
      const membership = {
        id: 1,
        teamId: 1,
        userId: 1,
        accepted: true,
        role: "ADMIN" as MembershipRole,
        customRoleId: null,
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(mockMembershipRepository, "findUniqueByUserIdAndTeamId").mockResolvedValueOnce(membership);
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(true);

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

      vi.spyOn(mockMembershipRepository, "findUniqueByUserIdAndTeamId").mockResolvedValueOnce(membership);
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(true);
      vi.spyOn(mockRepository, "getMembershipByMembershipId").mockResolvedValueOnce({
        id: membership.id,
        teamId: membership.teamId,
        userId: membership.userId,
        customRoleId: membership.customRoleId,
        team: { parentId: null },
      });
      vi.spyOn(mockRepository, "getOrgMembership").mockResolvedValueOnce(null);
      vi.spyOn(mockRepository, "checkRolePermissions").mockResolvedValueOnce(true);

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
      expect(mockRepository.getMembershipByMembershipId).toHaveBeenCalledWith(1);
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

      vi.spyOn(mockMembershipRepository, "findUniqueByUserIdAndTeamId").mockResolvedValueOnce(membership);
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(false);

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

    it("should return false when permissions array is empty", async () => {
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

      vi.spyOn(mockMembershipRepository, "findUniqueByUserIdAndTeamId").mockResolvedValueOnce(membership);
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(true);

      const result = await service.checkPermissions({
        userId: 1,
        teamId: 1,
        permissions: [],
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(false);
      // Should not call repository methods for empty permissions array (security measure)
      expect(mockRepository.checkRolePermissions).not.toHaveBeenCalled();
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

      vi.spyOn(mockRepository, "getUserMemberships").mockResolvedValueOnce(memberships);

      const result = await service.getUserPermissions(1);
      expect(result).toEqual(memberships);
      expect(mockRepository.getUserMemberships).toHaveBeenCalledWith(1);
    });
  });

  describe("getTeamIdsWithPermission", () => {
    it("should return team IDs where user has the specified permission", async () => {
      const expectedTeamIds = [1, 2, 3];
      vi.spyOn(mockRepository, "getTeamIdsWithPermission").mockResolvedValueOnce(expectedTeamIds);

      const result = await service.getTeamIdsWithPermission(1, "eventType.read");

      expect(result).toEqual(expectedTeamIds);
      expect(mockRepository.getTeamIdsWithPermission).toHaveBeenCalledWith(1, "eventType.read");
    });

    it("should return empty array when permission validation fails", async () => {
      vi.spyOn(mockPermissionService, "validatePermission").mockReturnValueOnce({
        isValid: false,
        error: "Invalid permissions",
      });

      const result = await service.getTeamIdsWithPermission(1, "eventType.read");

      expect(result).toEqual([]);
      expect(mockRepository.getTeamIdsWithPermission).not.toHaveBeenCalled();
    });

    it("should return empty array and log error when repository throws", async () => {
      vi.spyOn(mockRepository, "getTeamIdsWithPermission").mockRejectedValueOnce(new Error("Database error"));

      const result = await service.getTeamIdsWithPermission(1, "eventType.read");

      expect(result).toEqual([]);
      expect(mockRepository.getTeamIdsWithPermission).toHaveBeenCalledWith(1, "eventType.read");
    });
  });

  describe("getTeamIdsWithPermissions", () => {
    it("should return team IDs where user has all specified permissions", async () => {
      const expectedTeamIds = [1, 2];
      const permissions: PermissionString[] = ["eventType.read", "eventType.create"];
      vi.spyOn(mockRepository, "getTeamIdsWithPermissions").mockResolvedValueOnce(expectedTeamIds);

      const result = await service.getTeamIdsWithPermissions(1, permissions);

      expect(result).toEqual(expectedTeamIds);
      expect(mockRepository.getTeamIdsWithPermissions).toHaveBeenCalledWith(1, permissions);
    });

    it("should return empty array when permissions validation fails", async () => {
      vi.spyOn(mockPermissionService, "validatePermissions").mockReturnValueOnce({
        isValid: false,
        error: "Invalid permissions",
      });

      const result = await service.getTeamIdsWithPermissions(1, ["eventType.read"] as PermissionString[]);

      expect(result).toEqual([]);
      expect(mockRepository.getTeamIdsWithPermissions).not.toHaveBeenCalled();
    });

    it("should return empty array when permissions array is empty", async () => {
      vi.spyOn(mockRepository, "getTeamIdsWithPermissions").mockResolvedValueOnce([]);

      const result = await service.getTeamIdsWithPermissions(1, []);

      expect(result).toEqual([]);
      expect(mockRepository.getTeamIdsWithPermissions).toHaveBeenCalledWith(1, []);
    });

    it("should return empty array and log error when repository throws", async () => {
      const permissions: PermissionString[] = ["eventType.read", "eventType.create"];
      vi.spyOn(mockRepository, "getTeamIdsWithPermissions").mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await service.getTeamIdsWithPermissions(1, permissions);

      expect(result).toEqual([]);
      expect(mockRepository.getTeamIdsWithPermissions).toHaveBeenCalledWith(1, permissions);
    });
  });

  describe("getResourcePermissions", () => {
    it("should return empty array when PBAC is disabled", async () => {
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(false);

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
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(true);
      vi.spyOn(mockRepository, "getMembershipByUserAndTeam").mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: "team_role",
        team: { parentId: null },
      });
      vi.spyOn(mockRepository, "getOrgMembership").mockResolvedValueOnce(null);
      vi.spyOn(mockRepository, "getResourcePermissionsByRoleId").mockResolvedValueOnce(["create", "read"]);

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
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(true);
      vi.spyOn(mockRepository, "getMembershipByUserAndTeam").mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: "team_role",
        team: { parentId: null },
      });
      vi.spyOn(mockRepository, "getResourcePermissionsByRoleId").mockResolvedValueOnce([
        "create",
        "read",
        "update",
      ]);

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
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(true);
      vi.spyOn(mockRepository, "getMembershipByUserAndTeam").mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: "team_role",
        team: { parentId: 2 },
      });
      vi.spyOn(mockRepository, "getOrgMembership").mockResolvedValueOnce({
        id: 2,
        teamId: 2,
        userId: 1,
        customRoleId: "org_role",
      });

      // Mock team permissions - create implies read
      vi.spyOn(mockRepository, "getResourcePermissionsByRoleId")
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
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(true);
      vi.spyOn(mockRepository, "getMembershipByUserAndTeam").mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: "team_role",
        team: { parentId: 2 },
      });
      vi.spyOn(mockRepository, "getOrgMembership").mockResolvedValueOnce({
        id: 2,
        teamId: 2,
        userId: 1,
        customRoleId: "org_role",
      });

      // Mock overlapping permissions - both include read, update implies read
      vi.spyOn(mockRepository, "getResourcePermissionsByRoleId")
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
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(true);
      vi.spyOn(mockRepository, "getMembershipByUserAndTeam").mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: null,
        team: { parentId: 2 },
      });
      vi.spyOn(mockRepository, "getOrgMembership").mockResolvedValueOnce({
        id: 2,
        teamId: 2,
        userId: 1,
        customRoleId: "org_role",
      });

      // Update and delete imply read access
      vi.spyOn(mockRepository, "getResourcePermissionsByRoleId").mockResolvedValueOnce([
        "update",
        "delete",
        "read",
      ]);

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
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(true);
      vi.spyOn(mockRepository, "getMembershipByUserAndTeam").mockResolvedValueOnce(null);

      const result = await service.getResourcePermissions({
        userId: 1,
        teamId: 1,
        resource: Resource.EventType,
      });

      expect(result).toEqual([]);
      expect(mockRepository.getResourcePermissionsByRoleId).not.toHaveBeenCalled();
    });

    it("should return empty array and log error when repository throws", async () => {
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(true);
      vi.spyOn(mockRepository, "getMembershipByUserAndTeam").mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await service.getResourcePermissions({
        userId: 1,
        teamId: 1,
        resource: Resource.EventType,
      });

      expect(result).toEqual([]);
    });

    it("should enforce correct hierarchy - org permissions should take precedence over team permissions", async () => {
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(true);
      vi.spyOn(mockRepository, "getMembershipByUserAndTeam").mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: "admin_team_role",
        team: { parentId: 2 },
      });
      vi.spyOn(mockRepository, "getOrgMembership").mockResolvedValueOnce({
        id: 2,
        teamId: 2,
        userId: 1,
        customRoleId: "restricted_org_role",
      });

      // Team role has broad permissions - CUD actions include read
      // Org role has restricted permissions (only read)
      vi.spyOn(mockRepository, "getResourcePermissionsByRoleId")
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

    it("should expand permissions when user has manage permission", async () => {
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(true);
      vi.spyOn(mockRepository, "getMembershipByUserAndTeam").mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: "admin_role",
        team: { parentId: null },
      });

      // User has manage permission
      vi.spyOn(mockRepository, "getResourcePermissionsByRoleId").mockResolvedValueOnce(["manage", "read"]);

      const result = await service.getResourcePermissions({
        userId: 1,
        teamId: 1,
        resource: Resource.EventType,
      });

      // Should include all possible actions for eventType resource
      expect(result).toContain("eventType.manage");
      expect(result).toContain("eventType.create");
      expect(result).toContain("eventType.read");
      expect(result).toContain("eventType.update");
      expect(result).toContain("eventType.delete");
      expect(result.length).toBeGreaterThan(2); // More than just manage and read
    });

    it("should expand permissions when user has manage permission at org level", async () => {
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(true);
      vi.spyOn(mockRepository, "getMembershipByUserAndTeam").mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        userId: 1,
        customRoleId: "team_role",
        team: { parentId: 2 },
      });
      vi.spyOn(mockRepository, "getOrgMembership").mockResolvedValueOnce({
        id: 2,
        teamId: 2,
        userId: 1,
        customRoleId: "admin_role",
      });

      // Team has basic permissions, org has manage
      vi.spyOn(mockRepository, "getResourcePermissionsByRoleId")
        .mockResolvedValueOnce(["read"]) // team permissions
        .mockResolvedValueOnce(["manage"]); // org permissions

      const result = await service.getResourcePermissions({
        userId: 1,
        teamId: 1,
        resource: Resource.Role,
      });

      // Should include all possible actions for role resource due to manage permission
      expect(result).toContain("role.manage");
      expect(result).toContain("role.create");
      expect(result).toContain("role.read");
      expect(result).toContain("role.update");
      expect(result).toContain("role.delete");
    });
  });

  describe("hasPermission with manage permissions", () => {
    it("should return true when user has manage permission for the resource", async () => {
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

      vi.spyOn(mockMembershipRepository, "findUniqueByUserIdAndTeamId").mockResolvedValueOnce(membership);
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(true);
      vi.spyOn(mockRepository, "getMembershipByMembershipId").mockResolvedValueOnce({
        id: membership.id,
        teamId: membership.teamId,
        userId: membership.userId,
        customRoleId: membership.customRoleId,
        team: { parentId: null },
      });
      vi.spyOn(mockRepository, "getOrgMembership").mockResolvedValueOnce(null);

      // User doesn't have explicit permission but has manage permission
      vi.spyOn(mockRepository, "checkRolePermission")
        .mockResolvedValueOnce(false) // explicit permission check fails
        .mockResolvedValueOnce(true); // manage permission check succeeds

      const result = await service.checkPermission({
        userId: 1,
        teamId: 1,
        permission: "eventType.create",
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(true);
      expect(mockRepository.checkRolePermission).toHaveBeenCalledWith("admin_role", "eventType.create");
      expect(mockRepository.checkRolePermission).toHaveBeenCalledWith("admin_role", "eventType.manage");
    });

    it("should return true when user has manage permission at org level", async () => {
      const membership = {
        id: 1,
        teamId: 1,
        userId: 1,
        accepted: true,
        role: "MEMBER" as MembershipRole,
        customRoleId: "member_role",
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(mockMembershipRepository, "findUniqueByUserIdAndTeamId").mockResolvedValueOnce(membership);
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(true);
      vi.spyOn(mockRepository, "getMembershipByMembershipId").mockResolvedValueOnce({
        id: membership.id,
        teamId: membership.teamId,
        userId: membership.userId,
        customRoleId: membership.customRoleId,
        team: { parentId: 2 },
      });
      vi.spyOn(mockRepository, "getOrgMembership").mockResolvedValueOnce({
        id: 2,
        teamId: 2,
        userId: 1,
        customRoleId: "admin_role",
      });

      // Team level permissions fail, org level manage permission succeeds
      vi.spyOn(mockRepository, "checkRolePermission")
        .mockResolvedValueOnce(false) // team explicit permission
        .mockResolvedValueOnce(false) // team manage permission
        .mockResolvedValueOnce(true); // org manage permission

      const result = await service.checkPermission({
        userId: 1,
        teamId: 1,
        permission: "role.delete",
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(true);
      expect(mockRepository.checkRolePermission).toHaveBeenCalledWith("admin_role", "role.manage");
    });
  });

  describe("hasPermissions with manage permissions", () => {
    it("should return true when user has manage permissions for all requested resources", async () => {
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

      vi.spyOn(mockMembershipRepository, "findUniqueByUserIdAndTeamId").mockResolvedValueOnce(membership);
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(true);
      vi.spyOn(mockRepository, "getMembershipByMembershipId").mockResolvedValueOnce({
        id: membership.id,
        teamId: membership.teamId,
        userId: membership.userId,
        customRoleId: membership.customRoleId,
        team: { parentId: null },
      });
      vi.spyOn(mockRepository, "getOrgMembership").mockResolvedValueOnce(null);

      // Explicit permissions check fails, but manage permissions succeed
      vi.spyOn(mockRepository, "checkRolePermissions").mockResolvedValueOnce(false);
      vi.spyOn(mockRepository, "checkRolePermission")
        .mockResolvedValueOnce(true) // eventType.manage
        .mockResolvedValueOnce(true); // role.manage

      const result = await service.checkPermissions({
        userId: 1,
        teamId: 1,
        permissions: ["eventType.create", "eventType.update", "role.delete"],
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(true);
      expect(mockRepository.checkRolePermission).toHaveBeenCalledWith("admin_role", "eventType.manage");
      expect(mockRepository.checkRolePermission).toHaveBeenCalledWith("admin_role", "role.manage");
    });

    it("should return false when user has manage permission for some but not all requested resources", async () => {
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

      vi.spyOn(mockMembershipRepository, "findUniqueByUserIdAndTeamId").mockResolvedValueOnce(membership);
      vi.spyOn(mockFeaturesRepository, "checkIfTeamHasFeature").mockResolvedValueOnce(true);
      vi.spyOn(mockRepository, "getMembershipByMembershipId").mockResolvedValueOnce({
        id: membership.id,
        teamId: membership.teamId,
        userId: membership.userId,
        customRoleId: membership.customRoleId,
        team: { parentId: 2 },
      });
      vi.spyOn(mockRepository, "getOrgMembership").mockResolvedValueOnce({
        id: 2,
        teamId: 2,
        userId: 1,
        customRoleId: "admin_role",
      });

      // All explicit permission checks fail
      vi.spyOn(mockRepository, "checkRolePermissions")
        .mockResolvedValueOnce(false) // team permissions
        .mockResolvedValueOnce(false); // org permissions

      // Has manage for eventType but not for booking
      vi.spyOn(mockRepository, "checkRolePermission")
        .mockResolvedValueOnce(true) // team eventType.manage
        .mockResolvedValueOnce(false) // team booking.manage
        .mockResolvedValueOnce(true) // org eventType.manage (duplicate check)
        .mockResolvedValueOnce(false); // org booking.manage

      const result = await service.checkPermissions({
        userId: 1,
        teamId: 1,
        permissions: ["eventType.create", "booking.update"],
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(false);
    });
  });
});
