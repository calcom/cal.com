import { PrismaClient } from "@prisma/client";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { PermissionString } from "../../types/permission-registry";
import { RoleService } from "../role.service";

// Mock PrismaClient
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => ({
    $transaction: vi.fn((callback) =>
      callback({
        role: {
          create: vi.fn(),
          findUnique: vi.fn(),
          findMany: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        rolePermission: {
          createMany: vi.fn(),
          deleteMany: vi.fn(),
          findMany: vi.fn(),
        },
        membership: {
          update: vi.fn(),
        },
      })
    ),
    role: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    rolePermission: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    membership: {
      update: vi.fn(),
    },
  })),
}));

describe("RoleService", () => {
  const prisma = new PrismaClient();
  const service = new RoleService(prisma);

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

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback) => {
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
        } as unknown as PrismaClient;
        return callback(tx);
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
      };

      vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(role as any);
      vi.mocked(prisma.rolePermission.findMany).mockResolvedValueOnce([
        { permission: "eventType.create" },
        { permission: "eventType.read" },
      ] as any);

      const result = await service.getRole(roleId);
      expect(result).toBeDefined();
      expect(result?.permissions).toHaveLength(2);
    });

    it("should return null for non-existent role", async () => {
      vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(null);

      const result = await service.getRole("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("getTeamRoles", () => {
    it("should return all roles for a team", async () => {
      const teamId = 1;
      const roles = [
        { id: "role-1", name: "Role 1", teamId },
        { id: "role-2", name: "Role 2", teamId },
      ];

      vi.mocked(prisma.role.findMany).mockResolvedValueOnce(roles as any);
      vi.mocked(prisma.rolePermission.findMany).mockResolvedValueOnce([
        { roleId: "role-1", permission: "eventType.create" },
        { roleId: "role-2", permission: "eventType.read" },
      ] as any);

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
      };

      const mockPermissions = [
        { roleId, resource: "eventType", action: "create" },
        { roleId, resource: "eventType", action: "read" },
      ];

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback) => {
        const tx = {
          role: {
            create: vi.fn(),
            findUnique: vi.fn().mockResolvedValueOnce(mockRole),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          },
          rolePermission: {
            createMany: vi.fn().mockResolvedValueOnce({ count: 2 }),
            deleteMany: vi.fn().mockResolvedValueOnce({ count: 2 }),
            findMany: vi.fn().mockResolvedValueOnce(mockPermissions),
          },
          membership: {
            update: vi.fn(),
          },
        } as unknown as PrismaClient;
        return callback(tx);
      });

      const result = await service.updateRolePermissions(roleId, permissions);
      expect(result).toEqual({
        ...mockRole,
        permissions: mockPermissions,
      });
    });
  });

  describe("deleteRole", () => {
    it("should delete a role and its permissions", async () => {
      const roleId = "role-id";
      const mockDeletedRole = { id: roleId };

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback) => {
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
            findMany: vi.fn(),
          },
          membership: {
            update: vi.fn(),
          },
        } as unknown as PrismaClient;

        const result = await callback(tx);
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

      vi.mocked(prisma.membership.update).mockResolvedValueOnce({
        id: memberId,
        customRoleId: roleId,
      } as any);

      await service.assignRoleToMember(roleId, memberId);
      expect(prisma.membership.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { customRoleId: roleId },
      });
    });
  });

  describe("removeRoleFromMember", () => {
    it("should remove a role from a member", async () => {
      const memberId = 1;

      vi.mocked(prisma.membership.update).mockResolvedValueOnce({
        id: memberId,
        customRoleId: null,
      } as any);

      await service.removeRoleFromMember(memberId);
      expect(prisma.membership.update).toHaveBeenCalledWith({
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

      vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(mockRole as any);
      vi.mocked(prisma.rolePermission.findMany).mockResolvedValueOnce(mockPermissions as any);
      vi.mocked(prisma.membership.update).mockResolvedValueOnce(mockUpdatedMembership as any);

      const result = await service.changeUserRole(membershipId, roleId);
      expect(result).toEqual(mockUpdatedMembership);
      expect(prisma.membership.update).toHaveBeenCalledWith({
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
      vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.rolePermission.findMany).mockResolvedValueOnce([]);

      await expect(service.changeUserRole(membershipId, roleId)).rejects.toThrow("Role not found");
    });

    it("should verify role exists before updating membership", async () => {
      vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.rolePermission.findMany).mockResolvedValueOnce([]);

      await expect(service.changeUserRole(membershipId, roleId)).rejects.toThrow("Role not found");
      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { id: roleId },
      });
      // Since role doesn't exist, membership.update should not be called
      expect(prisma.membership.update).not.toHaveBeenCalled();
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

      vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(mockRole as any);
      vi.mocked(prisma.rolePermission.findMany).mockResolvedValueOnce(mockPermissions as any);
      vi.mocked(prisma.membership.update).mockResolvedValueOnce(mockUpdatedMembership as any);

      const result = await service.changeUserRole(membershipId, roleId);
      expect(result.customRole!.permissions).toHaveLength(3);
      expect(result.customRole!.permissions).toEqual(mockPermissions);
    });
  });
});
