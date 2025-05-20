import { vi, type Mock, describe, it, expect, beforeEach } from "vitest";

import type { MembershipRole } from "@calcom/prisma/enums";

import { PermissionRepository } from "../../repository/permission.repository";
import { PermissionCheckService } from "../permission-check.service";

vi.mock("../../repository/permission.repository", () => ({
  PermissionRepository: vi.fn(),
}));

type MockRepository = {
  [K in keyof PermissionRepository]: Mock;
};

describe("PermissionCheckService", () => {
  let service: PermissionCheckService;
  let mockRepository: MockRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      getMembershipByMembershipId: vi.fn(),
      getMembershipByUserAndTeam: vi.fn(),
      getOrgMembership: vi.fn(),
      getUserMemberships: vi.fn(),
      checkRolePermission: vi.fn(),
      checkRolePermissions: vi.fn(),
    };
    vi.mocked(PermissionRepository).mockImplementation(
      () => mockRepository as unknown as PermissionRepository
    );
    service = new PermissionCheckService();
  });

  describe("hasPermission", () => {
    it("should check permission by membershipId", async () => {
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
        team_parentId: null,
      };

      mockRepository.getMembershipByMembershipId.mockResolvedValueOnce(membership);
      mockRepository.checkRolePermission.mockResolvedValueOnce(true);

      const result = await service.hasPermission({ membershipId: 1 }, "eventType.create");
      expect(result).toBe(true);
      expect(mockRepository.getMembershipByMembershipId).toHaveBeenCalledWith(1);
      expect(mockRepository.checkRolePermission).toHaveBeenCalledWith("admin_role", "eventType.create");
    });

    it("should return false if neither team nor org has permission", async () => {
      const teamMembership = {
        id: 1,
        teamId: 2,
        userId: 1,
        accepted: true,
        role: "MEMBER" as MembershipRole,
        customRoleId: "team_role",
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        team_parentId: 1,
      };

      const orgMembership = {
        id: 2,
        teamId: 1,
        userId: 1,
        accepted: true,
        role: "MEMBER" as MembershipRole,
        customRoleId: "org_role",
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.getMembershipByMembershipId.mockResolvedValueOnce(teamMembership);
      mockRepository.checkRolePermission.mockResolvedValueOnce(false);
      mockRepository.getOrgMembership.mockResolvedValueOnce(orgMembership);
      mockRepository.checkRolePermission.mockResolvedValueOnce(false);

      const result = await service.hasPermission({ membershipId: 1 }, "eventType.create");
      expect(result).toBe(false);
      expect(mockRepository.getMembershipByMembershipId).toHaveBeenCalledWith(1);
      expect(mockRepository.checkRolePermission).toHaveBeenCalledWith("team_role", "eventType.create");
      expect(mockRepository.getOrgMembership).toHaveBeenCalledWith(1, 1);
      expect(mockRepository.checkRolePermission).toHaveBeenCalledWith("org_role", "eventType.create");
    });
  });

  describe("hasPermissions", () => {
    it("should check multiple permissions (AND condition)", async () => {
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
        team_parentId: null,
      };

      mockRepository.getMembershipByMembershipId.mockResolvedValueOnce(membership);
      mockRepository.checkRolePermissions.mockResolvedValueOnce(true);

      const result = await service.hasPermissions({ membershipId: 1 }, ["eventType.create", "team.invite"]);
      expect(result).toBe(true);
      expect(mockRepository.getMembershipByMembershipId).toHaveBeenCalledWith(1);
      expect(mockRepository.checkRolePermissions).toHaveBeenCalledWith("admin_role", [
        "eventType.create",
        "team.invite",
      ]);
    });

    it("should check multiple permissions in parent organization if team permissions not found", async () => {
      const teamMembership = {
        id: 1,
        teamId: 2,
        userId: 1,
        accepted: true,
        role: "MEMBER" as MembershipRole,
        customRoleId: "team_role",
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        team_parentId: 1,
      };

      const orgMembership = {
        id: 2,
        teamId: 1,
        userId: 1,
        accepted: true,
        role: "ADMIN" as MembershipRole,
        customRoleId: "org_role",
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.getMembershipByMembershipId.mockResolvedValueOnce(teamMembership);
      mockRepository.checkRolePermissions.mockResolvedValueOnce(false);
      mockRepository.getOrgMembership.mockResolvedValueOnce(orgMembership);
      mockRepository.checkRolePermissions.mockResolvedValueOnce(true);

      const result = await service.hasPermissions({ membershipId: 1 }, ["eventType.create", "team.invite"]);
      expect(result).toBe(true);
      expect(mockRepository.getMembershipByMembershipId).toHaveBeenCalledWith(1);
      expect(mockRepository.checkRolePermissions).toHaveBeenCalledWith("team_role", [
        "eventType.create",
        "team.invite",
      ]);
      expect(mockRepository.getOrgMembership).toHaveBeenCalledWith(1, 1);
      expect(mockRepository.checkRolePermissions).toHaveBeenCalledWith("org_role", [
        "eventType.create",
        "team.invite",
      ]);
    });

    it("should return false if neither team nor org has all required permissions", async () => {
      const teamMembership = {
        id: 1,
        teamId: 2,
        userId: 1,
        accepted: true,
        role: "MEMBER" as MembershipRole,
        customRoleId: "team_role",
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        team_parentId: 1,
      };

      const orgMembership = {
        id: 2,
        teamId: 1,
        userId: 1,
        accepted: true,
        role: "MEMBER" as MembershipRole,
        customRoleId: "org_role",
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.getMembershipByMembershipId.mockResolvedValueOnce(teamMembership);
      mockRepository.checkRolePermissions.mockResolvedValueOnce(false);
      mockRepository.getOrgMembership.mockResolvedValueOnce(orgMembership);
      mockRepository.checkRolePermissions.mockResolvedValueOnce(false);

      const result = await service.hasPermissions({ membershipId: 1 }, ["eventType.create", "team.invite"]);
      expect(result).toBe(false);
      expect(mockRepository.getMembershipByMembershipId).toHaveBeenCalledWith(1);
      expect(mockRepository.checkRolePermissions).toHaveBeenCalledWith("team_role", [
        "eventType.create",
        "team.invite",
      ]);
      expect(mockRepository.getOrgMembership).toHaveBeenCalledWith(1, 1);
      expect(mockRepository.checkRolePermissions).toHaveBeenCalledWith("org_role", [
        "eventType.create",
        "team.invite",
      ]);
    });
  });
});
