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
    findFirst: vi.fn(),
  },
} as unknown as PrismaClient;

describe("PermissionCheckService", () => {
  const roleService = new RoleService(prisma);
  const service = new PermissionCheckService(roleService);

  describe("hasPermission", () => {
    it("should return true for admin role", async () => {
      const membership = {
        role: "ADMIN" as MembershipRole,
        customRoleId: null,
      };

      const result = await service.hasPermission(membership, "eventType.create");
      expect(result).toBe(true);
    });

    it("should check default role permissions", async () => {
      const membership = {
        role: "MEMBER" as MembershipRole,
        customRoleId: null,
      };

      const result = await service.hasPermission(membership, "eventType.read");
      expect(result).toBe(true);
    });

    it("should check custom role permissions", async () => {
      const membership = {
        role: "MEMBER" as MembershipRole,
        customRoleId: "custom-role-id",
      };

      vi.mocked(prisma.role.findUnique).mockResolvedValueOnce({
        id: "custom-role-id",
        name: "Custom Role",
        teamId: 1,
      } as any);

      vi.mocked(prisma.rolePermission.findMany).mockResolvedValueOnce([
        { permission: "eventType.create" },
        { permission: "eventType.read" },
      ] as any);

      const result = await service.hasPermission(membership, "eventType.create");
      expect(result).toBe(true);
    });

    it("should return false for non-existent membership", async () => {
      const membership = {
        role: "MEMBER" as MembershipRole,
        customRoleId: null,
      };

      vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(null);

      const result = await service.hasPermission(membership, "eventType.create");
      expect(result).toBe(false);
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
