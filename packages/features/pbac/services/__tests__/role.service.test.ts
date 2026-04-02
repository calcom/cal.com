import { RoleType } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { Role } from "../../domain/models/Role";
import type { IRoleRepository } from "../../domain/repositories/IRoleRepository";
import type { PermissionString } from "../../domain/types/permission-registry";
import type { PermissionDiffService } from "../permission-diff.service";
import { RoleService } from "../role.service";

vi.mock("../../infrastructure/repositories/RoleRepository");
vi.mock("../permission-diff.service");

// Mock db.$transaction
vi.mock("@calcom/prisma", () => ({
  default: {
    $transaction: vi.fn((cb) => cb({ membership: { update: vi.fn() } })),
    membership: { update: vi.fn() },
  },
}));

type MockRepository = {
  [K in keyof IRoleRepository]: Mock;
};

describe("RoleService", () => {
  let service: RoleService;
  let mockRepository: MockRepository;
  let mockPermissionDiffService: { calculateDiff: Mock };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      findById: vi.fn(),
      findByName: vi.fn(),
      findByTeamId: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      roleBelongsToTeam: vi.fn(),
      getPermissions: vi.fn(),
      reassignUsersToRole: vi.fn(),
    };

    mockPermissionDiffService = {
      calculateDiff: vi.fn(),
    };

    service = new RoleService(
      mockRepository,
      undefined, // permissionService is not mocked as it's not relevant for these tests
      mockPermissionDiffService as unknown as PermissionDiffService
    );
  });

  describe("createRole", () => {
    it("should create a role with permissions", async () => {
      const roleData = {
        name: "Test Role",
        teamId: 1,
        permissions: ["eventType.create"] as PermissionString[],
        type: RoleType.CUSTOM,
      };

      const createdRole: Role = {
        id: "new-role",
        name: roleData.name,
        teamId: roleData.teamId,
        color: "#000000",
        type: RoleType.CUSTOM,
        permissions: [
          {
            id: "perm-1",
            resource: "eventType",
            action: "create",
            roleId: "new-role",
            createdAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByName.mockResolvedValueOnce(null);
      mockRepository.create.mockResolvedValueOnce(createdRole);

      const result = await service.createRole(roleData);
      expect(result).toBeDefined();
      expect(result.id).toBe("new-role");
      expect(result.name).toBe(roleData.name);
      expect(result.permissions).toHaveLength(1);
      expect(mockRepository.create).toHaveBeenCalledWith(roleData);
    });

    it("should throw error if role name already exists", async () => {
      const roleData = {
        name: "Test Role",
        teamId: 1,
        permissions: ["eventType.create"] as PermissionString[],
        type: RoleType.CUSTOM,
      };

      mockRepository.findByName.mockResolvedValueOnce({
        id: "existing-role",
        name: roleData.name,
        teamId: roleData.teamId,
        type: RoleType.CUSTOM,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.createRole(roleData)).rejects.toThrow(
        `Role with name "${roleData.name}" already exists`
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("should create a role with no permissions", async () => {
      const roleData = {
        name: "Empty Role",
        teamId: 1,
        permissions: [] as PermissionString[],
        type: RoleType.CUSTOM,
      };

      const createdRole: Role = {
        id: "new-role",
        name: roleData.name,
        teamId: roleData.teamId,
        color: "#000000",
        type: RoleType.CUSTOM,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByName.mockResolvedValueOnce(null);
      mockRepository.create.mockResolvedValueOnce(createdRole);

      const result = await service.createRole(roleData);
      expect(result).toBeDefined();
      expect(result.id).toBe("new-role");
      expect(result.name).toBe(roleData.name);
      expect(result.permissions).toHaveLength(0);
      expect(mockRepository.create).toHaveBeenCalledWith(roleData);
    });
  });

  describe("getRole", () => {
    it("should return role with permissions", async () => {
      const roleId = "role-id";
      const role: Role = {
        id: roleId,
        name: "Test Role",
        teamId: 1,
        color: "#000000",
        type: RoleType.CUSTOM,
        permissions: [
          { id: "perm-1", resource: "eventType", action: "create" },
          { id: "perm-2", resource: "eventType", action: "read" },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValueOnce(role);

      const result = await service.getRole(roleId);
      expect(result).toBeDefined();
      expect(result?.permissions).toHaveLength(2);
      expect(mockRepository.findById).toHaveBeenCalledWith(roleId);
    });

    it("should return null for non-existent role", async () => {
      mockRepository.findById.mockResolvedValueOnce(null);

      const result = await service.getRole("non-existent");
      expect(result).toBeNull();
      expect(mockRepository.findById).toHaveBeenCalledWith("non-existent");
    });
  });

  describe("update", () => {
    it("should update role permissions using permission diff", async () => {
      const roleId = "role-id";
      const permissions = ["eventType.create", "eventType.read"] as PermissionString[];
      const existingPermissions = [{ id: "1", roleId, resource: "eventType", action: "delete" }];

      const permissionChanges = {
        toAdd: [
          { resource: "eventType", action: "create" },
          { resource: "eventType", action: "read" },
        ],
        toRemove: [{ id: "1", roleId, resource: "eventType", action: "delete" }],
      };

      const role: Role = {
        id: roleId,
        name: "Test Role",
        teamId: 1,
        type: RoleType.CUSTOM,
        color: "#000000",
        permissions: [
          { id: "perm-1", resource: "eventType", action: "create" },
          { id: "perm-2", resource: "eventType", action: "read" },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValueOnce(role);
      mockRepository.getPermissions.mockResolvedValueOnce(existingPermissions);
      mockPermissionDiffService.calculateDiff.mockReturnValueOnce(permissionChanges);
      mockRepository.update.mockResolvedValueOnce(role);

      const result = await service.update({ roleId, permissions });

      expect(mockPermissionDiffService.calculateDiff).toHaveBeenCalledWith(permissions, existingPermissions);
      expect(mockRepository.update).toHaveBeenCalledWith(roleId, permissionChanges, {
        color: undefined,
        name: undefined,
      });
      expect(result).toBeDefined();
    });

    it("should properly remove multiple permissions when changing from all to none", async () => {
      const roleId = "role-id";
      const permissions = [] as PermissionString[]; // Setting to none
      const existingPermissions = [
        { id: "1", roleId, resource: "eventType", action: "create" },
        { id: "2", roleId, resource: "eventType", action: "read" },
        { id: "3", roleId, resource: "eventType", action: "update" },
        { id: "4", roleId, resource: "eventType", action: "delete" },
      ];

      const permissionChanges = {
        toAdd: [],
        toRemove: [
          { id: "1", roleId, resource: "eventType", action: "create" },
          { id: "2", roleId, resource: "eventType", action: "read" },
          { id: "3", roleId, resource: "eventType", action: "update" },
          { id: "4", roleId, resource: "eventType", action: "delete" },
        ],
      };

      const role: Role = {
        id: roleId,
        name: "Test Role",
        teamId: 1,
        type: RoleType.CUSTOM,
        color: "#000000",
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValueOnce(role);
      mockRepository.getPermissions.mockResolvedValueOnce(existingPermissions);
      mockPermissionDiffService.calculateDiff.mockReturnValueOnce(permissionChanges);
      mockRepository.update.mockResolvedValueOnce(role);

      const result = await service.update({ roleId, permissions });

      expect(mockPermissionDiffService.calculateDiff).toHaveBeenCalledWith(permissions, existingPermissions);
      expect(mockRepository.update).toHaveBeenCalledWith(roleId, permissionChanges, {
        color: undefined,
        name: undefined,
      });
      expect(result).toBeDefined();
      expect(result.permissions).toHaveLength(0);
    });

    it("should throw error if role does not exist", async () => {
      const roleId = "non-existent-role";
      const permissions = ["eventType.create"] as PermissionString[];

      mockRepository.findById.mockResolvedValueOnce(null);

      await expect(service.update({ roleId, permissions })).rejects.toThrow("Role not found");
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it("should throw error if trying to update system role", async () => {
      const roleId = "system-role";
      const permissions = ["eventType.create"] as PermissionString[];

      mockRepository.findById.mockResolvedValueOnce({
        id: roleId,
        name: "System Role",
        teamId: 1,
        type: RoleType.SYSTEM,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.update({ roleId, permissions })).rejects.toThrow("Cannot update default roles");
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteRole", () => {
    it("should delete a custom role and reassign users to member_role", async () => {
      const roleId = "role-id";
      const role: Role = {
        id: roleId,
        name: "Test Role",
        teamId: 1,
        color: "#000000",
        type: RoleType.CUSTOM,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValueOnce(role);
      mockRepository.reassignUsersToRole.mockResolvedValueOnce(void 0);
      mockRepository.delete.mockResolvedValueOnce(void 0);

      await service.deleteRole(roleId);
      expect(mockRepository.reassignUsersToRole).toHaveBeenCalledWith(roleId, "member_role");
      expect(mockRepository.delete).toHaveBeenCalledWith(roleId);
    });

    it("should reassign users before deleting the role", async () => {
      const roleId = "role-id";
      const role: Role = {
        id: roleId,
        name: "Test Role",
        teamId: 1,
        color: "#000000",
        type: RoleType.CUSTOM,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const callOrder: string[] = [];
      mockRepository.findById.mockResolvedValueOnce(role);
      mockRepository.reassignUsersToRole.mockImplementation(() => {
        callOrder.push("reassignUsersToRole");
        return Promise.resolve();
      });
      mockRepository.delete.mockImplementation(() => {
        callOrder.push("delete");
        return Promise.resolve();
      });

      await service.deleteRole(roleId);

      // Verify that reassignment happens before deletion
      expect(callOrder).toEqual(["reassignUsersToRole", "delete"]);
      expect(mockRepository.reassignUsersToRole).toHaveBeenCalledWith(roleId, "member_role");
      expect(mockRepository.delete).toHaveBeenCalledWith(roleId);
    });

    it("should throw error if trying to delete system role", async () => {
      const roleId = "system-role";
      mockRepository.findById.mockResolvedValueOnce({
        id: roleId,
        name: "System Role",
        teamId: 1,
        color: "#000000",
        type: RoleType.SYSTEM,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.deleteRole(roleId)).rejects.toThrow("Cannot delete default roles");
      expect(mockRepository.reassignUsersToRole).not.toHaveBeenCalled();
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it("should throw error if role does not exist", async () => {
      const roleId = "non-existent";
      mockRepository.findById.mockResolvedValueOnce(null);

      await expect(service.deleteRole(roleId)).rejects.toThrow("Role not found");
      expect(mockRepository.reassignUsersToRole).not.toHaveBeenCalled();
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe("assignRoleToMember", () => {
    const membershipId = 123;
    const roleId = "role-id";

    it("should assign role to member successfully", async () => {
      const role: Role = {
        id: roleId,
        name: "Test Role",
        teamId: 1,
        color: "#000000",
        type: RoleType.CUSTOM,
        permissions: [
          { id: "perm-1", resource: "eventType", action: "create" },
          { id: "perm-2", resource: "eventType", action: "read" },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValueOnce(role);

      const result = await service.assignRoleToMember(roleId, membershipId);
      expect(result).toEqual(role); // Check the full role object
    });

    it("should throw error if role does not exist", async () => {
      mockRepository.findById.mockResolvedValueOnce(null);

      await expect(service.assignRoleToMember(roleId, membershipId)).rejects.toThrow("Role not found");
      expect(mockRepository.findById).toHaveBeenCalledWith(roleId);
      // Do NOT expect transaction methods to be called, since the repository returns null
    });
  });
});
