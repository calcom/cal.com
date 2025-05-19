import prismaMock from "../../../../../tests/libs/__mocks__/prismaMock";

import { describe, it, expect, vi, beforeEach } from "vitest";

import type { PrismaClient } from "@calcom/prisma";

import type { PermissionString } from "../../types/permission-registry";
import { RoleService } from "../role.service";

describe("RoleService", () => {
  const service = new RoleService(prismaMock);

  beforeEach(() => {
    vi.clearAllMocks();
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
      };

      const mockPermissions = [
        { roleId: "role-id", resource: "eventType", action: "create" },
        { roleId: "role-id", resource: "eventType", action: "read" },
      ];

      prismaMock.$transaction.mockImplementationOnce(async (callback) => {
        const tx = {
          role: {
            create: vi.fn().mockResolvedValueOnce(mockRole),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          },
          rolePermission: {
            createMany: vi.fn().mockResolvedValueOnce({ count: 2 }),
            deleteMany: vi.fn(),
            findMany: vi.fn().mockResolvedValueOnce(mockPermissions),
          },
          membership: {
            update: vi.fn(),
          },
        };
        return callback(tx as unknown as PrismaClient);
      });

      const result = await service.createRole(roleData);
      expect(result).toBeDefined();
      expect(result).toEqual({
        ...mockRole,
        permissions: mockPermissions,
      });
    });
  });

  describe("getRole", () => {
    it("should return role with permissions", async () => {
      const roleId = "role-id";
      const role = {
        id: roleId,
        name: "Test Role",
        teamId: 1,
        permissions: [
          { resource: "eventType", action: "create" },
          { resource: "eventType", action: "read" },
        ],
      };

      prismaMock.role.findUnique.mockResolvedValueOnce(role as any);

      const result = await service.getRole(roleId);
      expect(result).toBeDefined();
      expect(result?.permissions).toHaveLength(2);
    });

    it("should return owner role with wildcard permissions", async () => {
      const role = {
        id: "owner_role",
        name: "Owner",
        isGlobal: true,
        isDefault: true,
        permissions: [{ roleId: "owner_role", resource: "*", action: "*" }],
      };

      prismaMock.role.findUnique.mockResolvedValueOnce(role as any);

      const result = await service.getRole("owner_role");
      expect(result).toBeDefined();
      expect(result?.permissions).toHaveLength(1);
      expect(result?.permissions[0]).toEqual({ roleId: "owner_role", resource: "*", action: "*" });
    });

    it("should return admin role with specific permissions", async () => {
      const adminPermissions = [
        { roleId: "admin_role", resource: "booking", action: "*" },
        { roleId: "admin_role", resource: "eventType", action: "*" },
        { roleId: "admin_role", resource: "team", action: "invite" },
        { roleId: "admin_role", resource: "team", action: "remove" },
      ];

      const role = {
        id: "admin_role",
        name: "Admin",
        isGlobal: true,
        isDefault: true,
        permissions: adminPermissions,
      };

      prismaMock.role.findUnique.mockResolvedValueOnce(role as any);

      const result = await service.getRole("admin_role");
      expect(result).toBeDefined();
      expect(result?.permissions).toHaveLength(4);
      expect(result?.permissions).toEqual(adminPermissions);
    });

    it("should return member role with basic permissions", async () => {
      const memberPermissions = [
        { roleId: "member_role", resource: "booking", action: "read" },
        { roleId: "member_role", resource: "eventType", action: "read" },
        { roleId: "member_role", resource: "team", action: "read" },
      ];

      const role = {
        id: "member_role",
        name: "Member",
        isGlobal: true,
        isDefault: true,
        permissions: memberPermissions,
      };

      prismaMock.role.findUnique.mockResolvedValueOnce(role as any);

      const result = await service.getRole("member_role");
      expect(result).toBeDefined();
      expect(result?.permissions).toHaveLength(3);
      expect(result?.permissions).toEqual(memberPermissions);
    });

    it("should return null for non-existent role", async () => {
      prismaMock.role.findUnique.mockResolvedValueOnce(null);

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
          permissions: [{ roleId: "role-1", resource: "eventType", action: "create" }],
        },
        {
          id: "role-2",
          name: "Role 2",
          teamId,
          permissions: [{ roleId: "role-2", resource: "eventType", action: "read" }],
        },
      ];

      prismaMock.role.findMany.mockResolvedValueOnce(roles as any);

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
        isDefault: false,
        isGlobal: false,
        permissions: [
          { roleId, resource: "eventType", action: "create" },
          { roleId, resource: "eventType", action: "read" },
        ],
      };

      // Mock the initial role existence check
      prismaMock.role.findUnique.mockResolvedValueOnce({
        ...mockRole,
      } as any);

      prismaMock.$transaction.mockImplementationOnce(async (callback) => {
        const tx = {
          role: {
            findUnique: vi.fn().mockResolvedValueOnce({
              ...mockRole,
            }),
            create: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          },
          rolePermission: {
            createMany: vi.fn().mockResolvedValueOnce({ count: 2 }),
            deleteMany: vi.fn().mockResolvedValueOnce({ count: 2 }),
            findMany: vi.fn().mockResolvedValueOnce([
              { roleId, resource: "eventType", action: "create" },
              { roleId, resource: "eventType", action: "read" },
            ]),
          },
        };

        const result = await callback(tx as unknown as PrismaClient);

        // Verify transaction operations
        expect(tx.rolePermission.deleteMany).toHaveBeenCalledWith({
          where: { roleId },
        });
        expect(tx.rolePermission.createMany).toHaveBeenCalledWith({
          data: [
            { roleId, resource: "eventType", action: "create" },
            { roleId, resource: "eventType", action: "read" },
          ],
        });

        return mockRole; // Return the complete role object
      });

      const result = await service.updateRolePermissions(roleId, permissions);
      expect(result).toEqual(mockRole);

      // Verify the role was checked for existence and not being a default role
      expect(prismaMock.role.findUnique).toHaveBeenCalledWith({
        where: { id: roleId },
        include: { permissions: true },
      });
    });

    it("should not allow updating default roles", async () => {
      const roleId = "owner_role";
      const permissions = ["eventType.create"] as PermissionString[];

      // Mock the role as a default role
      prismaMock.role.findUnique.mockResolvedValueOnce({
        id: roleId,
        name: "Owner",
        isDefault: true,
        isGlobal: true,
        permissions: [],
      } as any);

      await expect(service.updateRolePermissions(roleId, permissions)).rejects.toThrow(
        "Cannot update default roles"
      );
    });

    it("should throw error if role does not exist", async () => {
      const roleId = "non-existent-role";
      const permissions = ["eventType.create"] as PermissionString[];

      prismaMock.role.findUnique.mockResolvedValueOnce(null);

      await expect(service.updateRolePermissions(roleId, permissions)).rejects.toThrow("Role not found");
    });
  });

  describe("deleteRole", () => {
    it("should not allow deleting default roles", async () => {
      const defaultRoleIds = ["owner_role", "admin_role", "member_role"];

      for (const roleId of defaultRoleIds) {
        const role = {
          id: roleId,
          isDefault: true,
          isGlobal: true,
          permissions: [],
        };

        prismaMock.role.findUnique.mockResolvedValueOnce(role as any);

        await expect(service.deleteRole(roleId)).rejects.toThrow("Cannot delete default role");
      }
    });

    it("should delete a custom role and its permissions", async () => {
      const roleId = "role-id";
      const mockRole = {
        id: roleId,
        isDefault: false,
        isGlobal: false,
        permissions: [],
      };

      prismaMock.role.findUnique.mockResolvedValueOnce(mockRole as any);

      const mockDeletedRole = { id: roleId };

      prismaMock.$transaction.mockImplementationOnce(async (callback) => {
        const tx = {
          role: {
            create: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn().mockResolvedValueOnce(mockDeletedRole),
          },
          rolePermission: {
            createMany: vi.fn(),
            deleteMany: vi.fn().mockResolvedValueOnce({ count: 2 }),
          },
        };

        const result = await callback(tx as unknown as PrismaClient);
        expect(tx.rolePermission.deleteMany).toHaveBeenCalledWith({
          where: { roleId },
        });
        expect(tx.role.delete).toHaveBeenCalledWith({
          where: { id: roleId },
        });
        return result;
      });

      const result = await service.deleteRole(roleId);
      expect(result).toEqual(mockDeletedRole);
    });
  });

  describe("assignRoleToMember", () => {
    it("should assign a role to a member", async () => {
      const memberId = 1;
      const roleId = "role-id";

      prismaMock.membership.update.mockResolvedValueOnce({
        id: memberId,
        customRoleId: roleId,
      } as any);

      await service.assignRoleToMember(roleId, memberId);
      expect(prismaMock.membership.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { customRoleId: roleId },
      });
    });
  });

  describe("removeRoleFromMember", () => {
    it("should remove a role from a member", async () => {
      const memberId = 1;

      prismaMock.membership.update.mockResolvedValueOnce({
        id: memberId,
        customRoleId: null,
      } as any);

      await service.removeRoleFromMember(memberId);
      expect(prismaMock.membership.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { customRoleId: null },
      });
    });
  });

  describe("changeUserRole", () => {
    const membershipId = 123;
    const roleId = "role-id";

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should change user's role successfully", async () => {
      const mockRole = {
        id: roleId,
        name: "Test Role",
        teamId: 1,
      };

      const mockPermissions = [
        { roleId, resource: "eventType", action: "create" },
        { roleId, resource: "eventType", action: "read" },
      ];

      const mockUpdatedMembership = {
        id: membershipId,
        customRoleId: roleId,
        customRole: {
          ...mockRole,
          permissions: mockPermissions,
        },
      };

      prismaMock.role.findUnique.mockResolvedValueOnce(mockRole as any);
      prismaMock.rolePermission.findMany.mockResolvedValueOnce(mockPermissions as any);
      prismaMock.membership.update.mockResolvedValueOnce(mockUpdatedMembership as any);

      const result = await service.changeUserRole(membershipId, roleId);
      expect(result).toEqual(mockUpdatedMembership);
      expect(prismaMock.membership.update).toHaveBeenCalledWith({
        where: { id: membershipId },
        data: { customRoleId: roleId },
        include: {
          customRole: {
            include: {
              permissions: true,
            },
          },
        },
      });
    });

    it("should throw error if role does not exist", async () => {
      prismaMock.role.findUnique.mockResolvedValueOnce(null);
      prismaMock.rolePermission.findMany.mockResolvedValueOnce([]);

      await expect(service.changeUserRole(membershipId, roleId)).rejects.toThrow("Role not found");
    });

    it("should verify role exists before updating membership", async () => {
      prismaMock.role.findUnique.mockResolvedValueOnce(null);

      await expect(service.changeUserRole(membershipId, roleId)).rejects.toThrow("Role not found");
      expect(prismaMock.role.findUnique).toHaveBeenCalledWith({
        where: { id: roleId },
        include: { permissions: true },
      });
      // Since role doesn't exist, membership.update should not be called
      expect(prismaMock.membership.update).not.toHaveBeenCalled();
    });

    it("should include role permissions in response", async () => {
      const mockRole = {
        id: roleId,
        name: "Test Role",
        teamId: 1,
      };

      const mockPermissions = [
        { roleId, resource: "eventType", action: "create" },
        { roleId, resource: "eventType", action: "read" },
        { roleId, resource: "team", action: "invite" },
      ];

      const mockUpdatedMembership = {
        id: membershipId,
        customRoleId: roleId,
        customRole: {
          ...mockRole,
          permissions: mockPermissions,
        },
      };

      prismaMock.role.findUnique.mockResolvedValueOnce(mockRole as any);
      prismaMock.rolePermission.findMany.mockResolvedValueOnce(mockPermissions as any);
      prismaMock.membership.update.mockResolvedValueOnce(mockUpdatedMembership as any);

      const result = await service.changeUserRole(membershipId, roleId);
      expect(result.customRole!.permissions).toHaveLength(3);
      expect(result.customRole!.permissions).toEqual(mockPermissions);
    });
  });
});
