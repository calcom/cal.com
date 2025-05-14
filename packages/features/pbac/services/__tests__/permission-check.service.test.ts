import type { PrismaClient } from "@prisma/client";
import { describe, it, expect, vi } from "vitest";

import type { MembershipRole } from "@calcom/prisma/enums";

import { PermissionCheckService } from "../permission-check.service";
import { RoleService } from "../role.service";

// Mock PrismaClient
const prisma = {
  role: {
    findUnique: vi.fn(),
  },
  rolePermission: {
    findMany: vi.fn(),
  },
  membership: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
} as unknown as PrismaClient;

describe("PermissionCheckService", () => {
  const roleService = new RoleService(prisma);
  const service = new PermissionCheckService(roleService, prisma);

  beforeEach(() => {
    vi.clearAllMocks();
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

      vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce(membership);

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

      vi.mocked(prisma.membership.findFirst).mockResolvedValueOnce(membership);

      const result = await service.hasPermission({ userId: 1, teamId: 1 }, "eventType.read");
      expect(result).toBe(true);
    });

    it("should return false if membership not found", async () => {
      vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce(null);

      const result = await service.hasPermission({ membershipId: 999 }, "eventType.create");
      expect(result).toBe(false);
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

      vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce(membership);

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

      vi.mocked(prisma.membership.findFirst).mockResolvedValueOnce(membership);

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

      vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce(membership);
      vi.mocked(prisma.role.findUnique).mockResolvedValue(customRole as any);
      vi.mocked(prisma.rolePermission.findMany).mockResolvedValue(customRole.permissions as any);

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
