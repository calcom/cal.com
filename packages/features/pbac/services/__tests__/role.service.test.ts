import { PrismaClient } from "@prisma/client";
import { describe, it, expect, vi } from "vitest";

import type { PermissionString } from "../../types/permission-registry";
import { RoleService } from "../role.service";

// Mock PrismaClient
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => ({
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

      vi.mocked(prisma.role.create).mockResolvedValueOnce({
        id: "role-id",
        name: roleData.name,
        teamId: roleData.teamId,
      } as any);

      vi.mocked(prisma.rolePermission.createMany).mockResolvedValueOnce({ count: 2 } as any);

      const result = await service.createRole(roleData);
      expect(result).toBeDefined();
      expect(prisma.role.create).toHaveBeenCalledWith({
        data: {
          name: roleData.name,
          teamId: roleData.teamId,
        },
      });
      expect(prisma.rolePermission.createMany).toHaveBeenCalled();
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

      vi.mocked(prisma.rolePermission.deleteMany).mockResolvedValueOnce({ count: 2 } as any);
      vi.mocked(prisma.rolePermission.createMany).mockResolvedValueOnce({ count: 2 } as any);

      await service.updateRolePermissions(roleId, permissions);
      expect(prisma.rolePermission.deleteMany).toHaveBeenCalled();
      expect(prisma.rolePermission.createMany).toHaveBeenCalled();
    });
  });

  describe("deleteRole", () => {
    it("should delete a role and its permissions", async () => {
      const roleId = "role-id";

      vi.mocked(prisma.rolePermission.deleteMany).mockResolvedValueOnce({ count: 2 } as any);
      vi.mocked(prisma.role.delete).mockResolvedValueOnce({ id: roleId } as any);

      await service.deleteRole(roleId);
      expect(prisma.rolePermission.deleteMany).toHaveBeenCalled();
      expect(prisma.role.delete).toHaveBeenCalled();
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
});
