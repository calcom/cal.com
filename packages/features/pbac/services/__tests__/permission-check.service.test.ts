import prismaMock from "../../../../../tests/libs/__mocks__/prismaMock";

import { describe, it, expect, vi, beforeEach } from "vitest";

import type { MembershipRole } from "@calcom/prisma/enums";

import { PermissionCheckService } from "../permission-check.service";
import { RoleService } from "../role.service";

describe("PermissionCheckService", () => {
  let roleService: RoleService;
  let service: PermissionCheckService;

  beforeEach(() => {
    vi.clearAllMocks();
    roleService = new RoleService(prismaMock);
    service = new PermissionCheckService(roleService, prismaMock);
  });

  describe("hasPermission", () => {
    it("should check permission by membershipId", async () => {
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

      prismaMock.membership.findUnique.mockResolvedValueOnce(membership);

      const result = await service.hasPermission({ membershipId: 1 }, "eventType.create");
      expect(result).toBe(true);
    });

    it("should check permission by userId and teamId", async () => {
      const membership = {
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

      prismaMock.membership.findFirst.mockResolvedValueOnce(membership);

      const result = await service.hasPermission({ userId: 1, teamId: 1 }, "eventType.read");
      expect(result).toBe(true);
    });

    it("should return false if membership not found", async () => {
      prismaMock.membership.findUnique.mockResolvedValueOnce(null);

      const result = await service.hasPermission({ membershipId: 999 }, "eventType.create");
      expect(result).toBe(false);
    });

    it("should check permission by membershipId with default owner role", async () => {
      const membership = {
        id: 1,
        teamId: 1,
        userId: 1,
        accepted: true,
        role: "OWNER" as MembershipRole,
        customRoleId: "owner_role",
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const ownerRole = {
        id: "owner_role",
        name: "Owner",
        isGlobal: true,
        isDefault: true,
      };

      prismaMock.membership.findUnique.mockResolvedValueOnce(membership);
      prismaMock.role.findUnique.mockResolvedValueOnce(ownerRole as any);
      prismaMock.rolePermission.findMany.mockResolvedValueOnce([
        { roleId: "owner_role", resource: "*", action: "*" },
      ] as any);

      // Owner should have access to any permission
      const result1 = await service.hasPermission({ membershipId: 1 }, "eventType.create");
      const result2 = await service.hasPermission({ membershipId: 1 }, "team.delete");
      const result3 = await service.hasPermission({ membershipId: 1 }, "booking.readRecordings");

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });

    it("should check permission by membershipId with default admin role", async () => {
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

      const adminRole = {
        id: "admin_role",
        name: "Admin",
        isGlobal: true,
        isDefault: true,
      };

      const adminPermissions = [
        { roleId: "admin_role", resource: "booking", action: "*" },
        { roleId: "admin_role", resource: "eventType", action: "*" },
        { roleId: "admin_role", resource: "team", action: "invite" },
      ];

      prismaMock.membership.findUnique.mockResolvedValueOnce(membership);
      prismaMock.role.findUnique.mockResolvedValueOnce(adminRole as any);
      prismaMock.rolePermission.findMany.mockResolvedValueOnce(adminPermissions as any);

      // Admin should have specific permissions
      const result1 = await service.hasPermission({ membershipId: 1 }, "booking.create"); // true (wildcard)
      const result2 = await service.hasPermission({ membershipId: 1 }, "team.invite"); // true (specific)
      const result3 = await service.hasPermission({ membershipId: 1 }, "team.delete"); // false (not granted)

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(false);
    });

    it("should check permission by membershipId with default member role", async () => {
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

      const memberRole = {
        id: "member_role",
        name: "Member",
        isGlobal: true,
        isDefault: true,
      };

      const memberPermissions = [
        { roleId: "member_role", resource: "booking", action: "read" },
        { roleId: "member_role", resource: "eventType", action: "read" },
      ];

      prismaMock.membership.findUnique.mockResolvedValueOnce(membership);
      prismaMock.role.findUnique.mockResolvedValueOnce(memberRole as any);
      prismaMock.rolePermission.findMany.mockResolvedValueOnce(memberPermissions as any);

      // Member should only have read permissions
      const result1 = await service.hasPermission({ membershipId: 1 }, "booking.read"); // true
      const result2 = await service.hasPermission({ membershipId: 1 }, "eventType.read"); // true
      const result3 = await service.hasPermission({ membershipId: 1 }, "booking.create"); // false
      const result4 = await service.hasPermission({ membershipId: 1 }, "team.invite"); // false

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(false);
      expect(result4).toBe(false);
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
        customRoleId: null,
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.membership.findUnique.mockResolvedValueOnce(membership);

      const result = await service.hasPermissions({ membershipId: 1 }, ["eventType.create", "team.invite"]);
      expect(result).toBe(true);
    });

    it("should return false if any permission is missing", async () => {
      const membership = {
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

      prismaMock.membership.findFirst.mockResolvedValueOnce(membership);

      const result = await service.hasPermissions({ userId: 1, teamId: 1 }, [
        "eventType.read",
        "eventType.create",
      ]);
      expect(result).toBe(false);
    });

    it("should check custom role permissions", async () => {
      const membership = {
        id: 1,
        teamId: 1,
        userId: 1,
        accepted: true,
        role: "MEMBER" as MembershipRole,
        customRoleId: "custom-role-id",
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const customRole = {
        id: "custom-role-id",
        permissions: [
          { resource: "eventType", action: "create" },
          { resource: "eventType", action: "read" },
        ],
      };

      prismaMock.membership.findUnique.mockResolvedValueOnce(membership);
      prismaMock.role.findUnique.mockResolvedValue(customRole as any);
      prismaMock.rolePermission.findMany.mockResolvedValue(customRole.permissions as any);

      const result = await service.hasPermissions({ membershipId: 1 }, [
        "eventType.create",
        "eventType.read",
      ]);
      expect(result).toBe(true);
    });
  });

  // Note: These tests are commented out since they test private methods
  // We should test these through the public interface instead
  /*
  describe("checkDefaultRolePermission", () => {
    it("should return true for admin role", () => {
      expect(service.checkDefaultRolePermission("ADMIN", "eventType.create")).toBe(true);
    });

    it("should return true for owner role", () => {
      expect(service.checkDefaultRolePermission("OWNER", "eventType.create")).toBe(true);
    });

    it("should return true for member with read permission", () => {
      expect(service.checkDefaultRolePermission("MEMBER", "eventType.read")).toBe(true);
    });

    it("should return false for member without permission", () => {
      expect(service.checkDefaultRolePermission("MEMBER", "eventType.create")).toBe(false);
    });
  });

  describe("checkCustomRolePermission", () => {
    it("should return true for matching permission", () => {
      const permissions = ["eventType.create", "eventType.read"];
      expect(service.checkCustomRolePermission(permissions, "eventType.create")).toBe(true);
    });

    it("should return false for non-matching permission", () => {
      const permissions = ["eventType.read"];
      expect(service.checkCustomRolePermission(permissions, "eventType.create")).toBe(false);
    });

    it("should handle wildcard permissions", () => {
      const permissions = ["eventType.*"];
      expect(service.checkCustomRolePermission(permissions, "eventType.create")).toBe(true);
      expect(service.checkCustomRolePermission(permissions, "eventType.read")).toBe(true);
    });
  });

  describe("permissionMatches", () => {
    it("should match exact permissions", () => {
      expect(service.permissionMatches("eventType.create", "eventType.create")).toBe(true);
    });

    it("should match wildcard resource", () => {
      expect(service.permissionMatches("*.create", "eventType.create")).toBe(true);
    });

    it("should match wildcard action", () => {
      expect(service.permissionMatches("eventType.*", "eventType.create")).toBe(true);
    });

    it("should match double wildcard", () => {
      expect(service.permissionMatches("*.*", "eventType.create")).toBe(true);
    });

    it("should not match different permissions", () => {
      expect(service.permissionMatches("eventType.create", "eventType.read")).toBe(false);
    });
  });
  */
});
