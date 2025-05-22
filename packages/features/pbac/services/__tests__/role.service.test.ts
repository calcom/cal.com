import { vi, type Mock, describe, it, expect, beforeEach } from "vitest";

import { RoleType } from "@calcom/prisma/enums";

import { RoleRepository } from "../../repository/role.repository";
import type { PermissionString } from "../../types/permission-registry";
import { RoleService } from "../role.service";

vi.mock("../../repository/role.repository", () => ({
  RoleRepository: vi.fn(),
}));

type MockRepository = {
  [K in keyof RoleRepository]: Mock;
};

describe("RoleService", () => {
  let service: RoleService;
  let mockRepository: MockRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      findRoleByName: vi.fn(),
      createRole: vi.fn(),
      createRolePermissions: vi.fn(),
      findRoleWithPermissions: vi.fn(),
      findTeamRoles: vi.fn(),
      deleteRolePermissions: vi.fn(),
      deleteRole: vi.fn(),
      updateMembershipRole: vi.fn(),
      transaction: vi.fn(),
    };
    vi.mocked(RoleRepository).mockImplementation(() => mockRepository as unknown as RoleRepository);
    service = new RoleService();
  });

  describe("createRole", () => {
    it("should create a role with permissions", async () => {
      const roleData = {
        name: "Test Role",
        teamId: 1,
        permissions: ["eventType.create", "eventType.read"] as PermissionString[],
      };

      const mockRole = {
        id: "role-id",
        name: roleData.name,
        teamId: roleData.teamId,
        type: RoleType.CUSTOM,
      };

      const mockPermissions = [
        { roleId: "role-id", resource: "eventType", action: "create" },
        { roleId: "role-id", resource: "eventType", action: "read" },
      ];

      mockRepository.findRoleByName.mockResolvedValueOnce(null);
      mockRepository.transaction.mockImplementationOnce(async (callback) => {
        mockRepository.createRole.mockResolvedValueOnce(mockRole);
        mockRepository.createRolePermissions.mockResolvedValueOnce({ count: 2 });
        return callback(mockRepository);
      });

      const result = await service.createRole(roleData);
      expect(result).toBeDefined();
      expect(mockRepository.createRole).toHaveBeenCalledWith({
        name: roleData.name,
        teamId: roleData.teamId,
        type: RoleType.CUSTOM,
      });
      expect(mockRepository.createRolePermissions).toHaveBeenCalledWith(mockRole.id, roleData.permissions);
    });

    it("should throw error if role name already exists", async () => {
      const roleData = {
        name: "Test Role",
        teamId: 1,
        permissions: ["eventType.create"] as PermissionString[],
      };

      mockRepository.findRoleByName.mockResolvedValueOnce({
        id: "existing-role",
        name: roleData.name,
      });

      await expect(service.createRole(roleData)).rejects.toThrow(
        `Role with name "${roleData.name}" already exists`
      );
    });
  });

  describe("getRole", () => {
    it("should return role with permissions", async () => {
      const roleId = "role-id";
      const role = {
        id: roleId,
        name: "Test Role",
        teamId: 1,
        type: RoleType.CUSTOM,
        permissions: [
          { resource: "eventType", action: "create" },
          { resource: "eventType", action: "read" },
        ],
      };

      mockRepository.findRoleWithPermissions.mockResolvedValueOnce(role);

      const result = await service.getRole(roleId);
      expect(result).toBeDefined();
      expect(result?.permissions).toHaveLength(2);
    });

    it("should return null for non-existent role", async () => {
      mockRepository.findRoleWithPermissions.mockResolvedValueOnce(null);

      const result = await service.getRole("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("getTeamRoles", () => {
    it("should return all roles for a team", async () => {
      const teamId = 1;
      const roles = [
        {
          id: "role-1",
          name: "Role 1",
          teamId,
          type: RoleType.CUSTOM,
          permissions: [{ roleId: "role-1", resource: "eventType", action: "create" }],
        },
        {
          id: "role-2",
          name: "Role 2",
          teamId,
          type: RoleType.CUSTOM,
          permissions: [{ roleId: "role-2", resource: "eventType", action: "read" }],
        },
      ];

      mockRepository.findTeamRoles.mockResolvedValueOnce(roles);

      const result = await service.getTeamRoles(teamId);
      expect(result).toHaveLength(2);
      expect(result[0].permissions).toHaveLength(1);
    });
  });

  describe("updateRolePermissions", () => {
    it("should update role permissions", async () => {
      const roleId = "role-id";
      const permissions = ["eventType.create", "eventType.read"] as PermissionString[];

      const mockRole = {
        id: roleId,
        name: "Test Role",
        teamId: 1,
        type: RoleType.CUSTOM,
        permissions: [
          { roleId, resource: "eventType", action: "create" },
          { roleId, resource: "eventType", action: "read" },
        ],
      };

      mockRepository.findRoleWithPermissions.mockResolvedValueOnce(mockRole);
      mockRepository.transaction.mockImplementationOnce(async (callback) => {
        mockRepository.deleteRolePermissions.mockResolvedValueOnce({ count: 2 });
        mockRepository.createRolePermissions.mockResolvedValueOnce({ count: 2 });
        return callback(mockRepository);
      });

      const result = await service.updateRolePermissions(roleId, permissions);
      expect(result).toBeDefined();
      expect(mockRepository.deleteRolePermissions).toHaveBeenCalledWith(roleId);
      expect(mockRepository.createRolePermissions).toHaveBeenCalledWith(roleId, permissions);
    });

    it("should throw error if role does not exist", async () => {
      const roleId = "non-existent-role";
      const permissions = ["eventType.create"] as PermissionString[];

      mockRepository.findRoleWithPermissions.mockResolvedValueOnce(null);

      await expect(service.updateRolePermissions(roleId, permissions)).rejects.toThrow("Role not found");
    });

    it("should throw error if trying to update system role", async () => {
      const roleId = "system-role";
      const permissions = ["eventType.create"] as PermissionString[];

      mockRepository.findRoleWithPermissions.mockResolvedValueOnce({
        id: roleId,
        type: RoleType.SYSTEM,
      });

      await expect(service.updateRolePermissions(roleId, permissions)).rejects.toThrow(
        "Cannot update default roles"
      );
    });
  });

  describe("deleteRole", () => {
    it("should delete a custom role", async () => {
      const roleId = "role-id";
      const mockRole = {
        id: roleId,
        type: RoleType.CUSTOM,
      };

      mockRepository.findRoleWithPermissions.mockResolvedValueOnce(mockRole);
      mockRepository.transaction.mockImplementationOnce(async (callback) => {
        mockRepository.deleteRolePermissions.mockResolvedValueOnce({ count: 1 });
        mockRepository.deleteRole.mockResolvedValueOnce(mockRole);
        return callback(mockRepository);
      });

      const result = await service.deleteRole(roleId);
      expect(result).toBeDefined();
      expect(mockRepository.deleteRolePermissions).toHaveBeenCalledWith(roleId);
      expect(mockRepository.deleteRole).toHaveBeenCalledWith(roleId);
    });

    it("should throw error if trying to delete system role", async () => {
      const roleId = "system-role";
      mockRepository.findRoleWithPermissions.mockResolvedValueOnce({
        id: roleId,
        type: RoleType.SYSTEM,
      });

      await expect(service.deleteRole(roleId)).rejects.toThrow("Cannot delete default roles");
    });

    it("should throw error if role does not exist", async () => {
      const roleId = "non-existent";
      mockRepository.findRoleWithPermissions.mockResolvedValueOnce(null);

      await expect(service.deleteRole(roleId)).rejects.toThrow("Role not found");
    });
  });

  describe("changeUserRole", () => {
    const membershipId = 123;
    const roleId = "role-id";

    it("should change user's role successfully", async () => {
      const mockRole = {
        id: roleId,
        name: "Test Role",
        teamId: 1,
        type: RoleType.CUSTOM,
        permissions: [
          { roleId, resource: "eventType", action: "create" },
          { roleId, resource: "eventType", action: "read" },
        ],
      };

      mockRepository.findRoleWithPermissions.mockResolvedValueOnce(mockRole);
      mockRepository.updateMembershipRole.mockResolvedValueOnce({
        id: membershipId,
        customRoleId: roleId,
      });

      const result = await service.changeUserRole(membershipId, roleId);
      expect(result).toBeDefined();
      expect(mockRepository.updateMembershipRole).toHaveBeenCalledWith(membershipId, roleId);
    });

    it("should throw error if role does not exist", async () => {
      mockRepository.findRoleWithPermissions.mockResolvedValueOnce(null);

      await expect(service.changeUserRole(membershipId, roleId)).rejects.toThrow("Role not found");
      expect(mockRepository.updateMembershipRole).not.toHaveBeenCalled();
    });
  });
});
