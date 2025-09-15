import { prisma } from "@calcom/prisma/__mocks__/prisma";

import { vi, type Mock, describe, it, expect, beforeEach } from "vitest";

import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import type { MembershipRole } from "@calcom/prisma/enums";

import type { IPermissionRepository } from "../../domain/repositories/IPermissionRepository";
import type { PermissionString } from "../../domain/types/permission-registry";
import { Resource } from "../../domain/types/permission-registry";
import { PermissionCheckService } from "../permission-check.service";
import type { PermissionService } from "../permission.service";

vi.mock("../../infrastructure/repositories/PermissionRepository");
vi.mock("@calcom/features/flags/features.repository");
vi.mock("@calcom/lib/server/repository/membership");
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      getMembershipByMembershipId: vi.fn(),
      getMembershipByUserAndTeam: vi.fn(),
      getOrgMembership: vi.fn(),
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

    service = new PermissionCheckService(
      mockRepository,
      mockFeaturesRepository as unknown as FeaturesRepository,
      mockPermissionService as unknown as PermissionService
    );

    // Mock MembershipRepository static method
    (MembershipRepository.findUniqueByUserIdAndTeamId as Mock) = vi.fn();
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

      (MembershipRepository.findUniqueByUserIdAndTeamId as Mock).mockResolvedValueOnce(membership);
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByMembershipId.mockResolvedValueOnce({
        id: membership.id,
        teamId: membership.teamId,
        userId: membership.userId,
        customRoleId: membership.customRoleId,
        team: { parentId: null },
      });
      mockRepository.getOrgMembership.mockResolvedValueOnce(null);
      mockRepository.checkRolePermission.mockResolvedValueOnce(true);

      const result = await service.checkPermission({
        userId: 1,
        teamId: 1,
        permission: "eventType.create",
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(true);
      expect(MembershipRepository.findUniqueByUserIdAndTeamId).toHaveBeenCalledWith({
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

      (MembershipRepository.findUniqueByUserIdAndTeamId as Mock).mockResolvedValueOnce(membership);
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(false);

      const result = await service.checkPermission({
        userId: 1,
        teamId: 1,
        permission: "eventType.create",
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(true);
      expect(MembershipRepository.findUniqueByUserIdAndTeamId).toHaveBeenCalledWith({
        userId: 1,
        teamId: 1,
      });
      expect(mockFeaturesRepository.checkIfTeamHasFeature).toHaveBeenCalledWith(1, "pbac");
      expect(mockRepository.checkRolePermission).not.toHaveBeenCalled();
    });

    it("should return false if membership not found", async () => {
      (MembershipRepository.findUniqueByUserIdAndTeamId as Mock).mockResolvedValueOnce(null);

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

      (MembershipRepository.findUniqueByUserIdAndTeamId as Mock).mockResolvedValueOnce(membership);
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);

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

      (MembershipRepository.findUniqueByUserIdAndTeamId as Mock).mockResolvedValueOnce(membership);
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByMembershipId.mockResolvedValueOnce({
        id: membership.id,
        teamId: membership.teamId,
        userId: membership.userId,
        customRoleId: membership.customRoleId,
        team: { parentId: null },
      });
      mockRepository.getOrgMembership.mockResolvedValueOnce(null);
      mockRepository.checkRolePermissions.mockResolvedValueOnce(true);

      const result = await service.checkPermissions({
        userId: 1,
        teamId: 1,
        permissions: ["eventType.create", "team.invite"],
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(true);
      expect(MembershipRepository.findUniqueByUserIdAndTeamId).toHaveBeenCalledWith({
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

      (MembershipRepository.findUniqueByUserIdAndTeamId as Mock).mockResolvedValueOnce(membership);
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(false);

      const result = await service.checkPermissions({
        userId: 1,
        teamId: 1,
        permissions: ["eventType.create", "team.invite"],
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toBe(true);
      expect(MembershipRepository.findUniqueByUserIdAndTeamId).toHaveBeenCalledWith({
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
        role: "MEMBER" as MembershipRole, // Change to MEMBER so fallback also fails
        customRoleId: "admin_role",
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (MembershipRepository.findUniqueByUserIdAndTeamId as Mock).mockResolvedValueOnce(membership);
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValueOnce(true);
      mockRepository.getMembershipByMembershipId.mockResolvedValueOnce({
        id: membership.id,
        teamId: membership.teamId,
        userId: membership.userId,
        customRoleId: membership.customRoleId,
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

      const result = await service.getTeamIdsWithPermission(1, "eventType.read");

      expect(result).toEqual(expectedTeamIds);
      expect(mockRepository.getTeamIdsWithPermission).toHaveBeenCalledWith(1, "eventType.read");
    });

    it("should return empty array when permission validation fails", async () => {
      mockPermissionService.validatePermission.mockReturnValueOnce({
        isValid: false,
        error: "Invalid permissions",
      });

      const result = await service.getTeamIdsWithPermission(1, "eventType.read");

      expect(result).toEqual([]);
      expect(mockRepository.getTeamIdsWithPermission).not.toHaveBeenCalled();
    });

    it("should return empty array and log error when repository throws", async () => {
      mockRepository.getTeamIdsWithPermission.mockRejectedValueOnce(new Error("Database error"));

      const result = await service.getTeamIdsWithPermission(1, "eventType.read");

      expect(result).toEqual([]);
      expect(mockRepository.getTeamIdsWithPermission).toHaveBeenCalledWith(1, "eventType.read");
    });
  });

  describe("getTeamIdsWithPermissions", () => {
    it("should return team IDs where user has all specified permissions", async () => {
      const expectedTeamIds = [1, 2];
      const permissions: PermissionString[] = ["eventType.read", "eventType.create"];
      mockRepository.getTeamIdsWithPermissions.mockResolvedValueOnce(expectedTeamIds);

      const result = await service.getTeamIdsWithPermissions(1, permissions);

      expect(result).toEqual(expectedTeamIds);
      expect(mockRepository.getTeamIdsWithPermissions).toHaveBeenCalledWith(1, permissions);
    });

    it("should return empty array when permissions validation fails", async () => {
      mockPermissionService.validatePermissions.mockReturnValueOnce({
        isValid: false,
        error: "Invalid permissions",
      });

      const result = await service.getTeamIdsWithPermissions(1, ["eventType.read"] as PermissionString[]);

      expect(result).toEqual([]);
      expect(mockRepository.getTeamIdsWithPermissions).not.toHaveBeenCalled();
    });

    it("should return empty array when permissions array is empty", async () => {
      mockRepository.getTeamIdsWithPermissions.mockResolvedValueOnce([]);

      const result = await service.getTeamIdsWithPermissions(1, []);

      expect(result).toEqual([]);
      expect(mockRepository.getTeamIdsWithPermissions).toHaveBeenCalledWith(1, []);
    });

    it("should return empty array and log error when repository throws", async () => {
      const permissions: PermissionString[] = ["eventType.read", "eventType.create"];
      mockRepository.getTeamIdsWithPermissions.mockRejectedValueOnce(new Error("Database error"));

      const result = await service.getTeamIdsWithPermissions(1, permissions);

      expect(result).toEqual([]);
      expect(mockRepository.getTeamIdsWithPermissions).toHaveBeenCalledWith(1, permissions);
    });
  });

  describe("getResourcePermissions", () => {
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
