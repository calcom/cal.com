import prismaMock from "../../../../../tests/libs/__mocks__/prismaMock";

import { describe, it, expect, vi, beforeEach } from "vitest";

import type { MembershipRole } from "@calcom/prisma/enums";

import { PermissionCheckService } from "../permission-check.service";

describe("PermissionCheckService", () => {
  let service: PermissionCheckService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PermissionCheckService(prismaMock);
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
        team: {
          parentId: null,
        },
      };

      prismaMock.membership.findUnique.mockResolvedValueOnce(membership);
      prismaMock.rolePermission.findFirst.mockResolvedValueOnce({
        id: "1",
        roleId: "admin_role",
        resource: "eventType",
        action: "*",
        createdAt: new Date(),
      });

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
        customRoleId: "member_role",
        disableImpersonation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        team: {
          parentId: null,
        },
      };

      prismaMock.membership.findFirst.mockResolvedValueOnce(membership);
      prismaMock.rolePermission.findFirst.mockResolvedValueOnce({
        id: "1",
        roleId: "member_role",
        resource: "eventType",
        action: "read",
        createdAt: new Date(),
      });

      const result = await service.hasPermission({ userId: 1, teamId: 1 }, "eventType.read");
      expect(result).toBe(true);
    });

    it("should return false if membership not found", async () => {
      prismaMock.membership.findUnique.mockResolvedValueOnce(null);

      const result = await service.hasPermission({ membershipId: 999 }, "eventType.create");
      expect(result).toBe(false);
    });

    it("should check permission in parent organization if team permission not found", async () => {
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
        team: {
          parentId: 1, // Parent org ID
        },
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

      // Mock team membership without the required permission
      prismaMock.membership.findUnique.mockResolvedValueOnce(teamMembership);
      prismaMock.rolePermission.findFirst.mockResolvedValueOnce(null);

      // Mock org membership with the required permission
      prismaMock.membership.findFirst.mockResolvedValueOnce(orgMembership);
      prismaMock.rolePermission.findFirst.mockResolvedValueOnce({
        id: "1",
        roleId: "org_role",
        resource: "eventType",
        action: "create",
        createdAt: new Date(),
      });

      const result = await service.hasPermission({ membershipId: 1 }, "eventType.create");
      expect(result).toBe(true);
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
        team: {
          parentId: 1,
        },
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

      // Mock team membership without permission
      prismaMock.membership.findUnique.mockResolvedValueOnce(teamMembership);
      prismaMock.rolePermission.findFirst.mockResolvedValueOnce(null);

      // Mock org membership without permission
      prismaMock.membership.findFirst.mockResolvedValueOnce(orgMembership);
      prismaMock.rolePermission.findFirst.mockResolvedValueOnce(null);

      const result = await service.hasPermission({ membershipId: 1 }, "eventType.create");
      expect(result).toBe(false);
    });

    // it("should check permission by membershipId with default owner role", async () => {
    //   const membership = {
    //     id: 1,
    //     teamId: 1,
    //     userId: 1,
    //     accepted: true,
    //     role: "OWNER" as MembershipRole,
    //     customRoleId: "owner_role",
    //     disableImpersonation: false,
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    //   };

    //   prismaMock.membership.findUnique.mockResolvedValueOnce(membership);
    //   // Mock global wildcard permission for owner - use mockResolvedValueOnce for each call
    //   prismaMock.rolePermission.findFirst
    //     .mockResolvedValueOnce({
    //       id: "1",
    //       roleId: "owner_role",
    //       resource: "*",
    //       action: "*",
    //       createdAt: new Date(),
    //     })
    //     .mockResolvedValueOnce({
    //       id: "1",
    //       roleId: "owner_role",
    //       resource: "*",
    //       action: "*",
    //       createdAt: new Date(),
    //     })
    //     .mockResolvedValueOnce({
    //       id: "1",
    //       roleId: "owner_role",
    //       resource: "*",
    //       action: "*",
    //       createdAt: new Date(),
    //     });

    //   // Owner should have access to any permission
    //   const result1 = await service.hasPermission({ membershipId: 1 }, "eventType.create");
    //   const result2 = await service.hasPermission({ membershipId: 1 }, "team.delete");
    //   const result3 = await service.hasPermission({ membershipId: 1 }, "booking.readRecordings");

    //   expect(result1).toBe(true);
    //   expect(result2).toBe(true);
    //   expect(result3).toBe(true);
    // });

    // it("should check permission by membershipId with default admin role", async () => {
    //   const membership = {
    //     id: 1,
    //     teamId: 1,
    //     userId: 1,
    //     accepted: true,
    //     role: "ADMIN" as MembershipRole,
    //     customRoleId: "admin_role",
    //     disableImpersonation: false,
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    //   };

    //   prismaMock.membership.findUnique.mockResolvedValueOnce(membership);

    //   // Mock different permission checks
    //   prismaMock.rolePermission.findFirst
    //     .mockResolvedValueOnce({
    //       id: "1",
    //       roleId: "admin_role",
    //       resource: "booking",
    //       action: "*",
    //       createdAt: new Date(),
    //     })
    //     .mockResolvedValueOnce({
    //       id: "2",
    //       roleId: "admin_role",
    //       resource: "team",
    //       action: "invite",
    //       createdAt: new Date(),
    //     })
    //     .mockResolvedValueOnce(null); // For team.delete

    //   // Admin should have specific permissions
    //   const result1 = await service.hasPermission({ membershipId: 1 }, "booking.create"); // true (wildcard)
    //   const result2 = await service.hasPermission({ membershipId: 1 }, "team.invite"); // true (specific)
    //   const result3 = await service.hasPermission({ membershipId: 1 }, "team.delete"); // false (not granted)

    //   expect(result1).toBe(true);
    //   expect(result2).toBe(true);
    //   expect(result3).toBe(false);
    // });

    // it("should check permission by membershipId with default member role", async () => {
    //   const membership = {
    //     id: 1,
    //     teamId: 1,
    //     userId: 1,
    //     accepted: true,
    //     role: "MEMBER" as MembershipRole,
    //     customRoleId: "member_role",
    //     disableImpersonation: false,
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    //   };

    //   prismaMock.membership.findUnique.mockResolvedValueOnce(membership);

    //   // Mock different permission checks
    //   prismaMock.rolePermission.findFirst
    //     .mockResolvedValueOnce({
    //       id: "1",
    //       roleId: "member_role",
    //       resource: "booking",
    //       action: "read",
    //       createdAt: new Date(),
    //     })
    //     .mockResolvedValueOnce({
    //       id: "2",
    //       roleId: "member_role",
    //       resource: "eventType",
    //       action: "read",
    //       createdAt: new Date(),
    //     })
    //     .mockResolvedValueOnce(null) // For booking.create
    //     .mockResolvedValueOnce(null); // For team.invite

    //   // Member should only have read permissions
    //   const result1 = await service.hasPermission({ membershipId: 1 }, "booking.read"); // true
    //   const result2 = await service.hasPermission({ membershipId: 1 }, "eventType.read"); // true
    //   const result3 = await service.hasPermission({ membershipId: 1 }, "booking.create"); // false
    //   const result4 = await service.hasPermission({ membershipId: 1 }, "team.invite"); // false

    //   expect(result1).toBe(true);
    //   expect(result2).toBe(true);
    //   expect(result3).toBe(false);
    //   expect(result4).toBe(false);
    // });
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
        team: {
          parentId: null,
        },
      };

      prismaMock.membership.findUnique.mockResolvedValueOnce(membership);
      prismaMock.rolePermission.count.mockResolvedValueOnce(2); // Both permissions match

      const result = await service.hasPermissions({ membershipId: 1 }, ["eventType.create", "team.invite"]);
      expect(result).toBe(true);
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
        team: {
          parentId: 1,
        },
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

      // Mock team membership without required permissions
      prismaMock.membership.findUnique.mockResolvedValueOnce(teamMembership);
      prismaMock.rolePermission.count.mockResolvedValueOnce(1); // Only one permission matches

      // Mock org membership with all required permissions
      prismaMock.membership.findFirst.mockResolvedValueOnce(orgMembership);
      prismaMock.rolePermission.count.mockResolvedValueOnce(2); // Both permissions match

      const result = await service.hasPermissions({ membershipId: 1 }, ["eventType.create", "team.invite"]);
      expect(result).toBe(true);
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
        team: {
          parentId: 1,
        },
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

      // Mock team membership with partial permissions
      prismaMock.membership.findUnique.mockResolvedValueOnce(teamMembership);
      prismaMock.rolePermission.count.mockResolvedValueOnce(1); // Only one permission matches

      // Mock org membership with partial permissions
      prismaMock.membership.findFirst.mockResolvedValueOnce(orgMembership);
      prismaMock.rolePermission.count.mockResolvedValueOnce(1); // Only one permission matches

      const result = await service.hasPermissions({ membershipId: 1 }, ["eventType.create", "team.invite"]);
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

      prismaMock.membership.findUnique.mockResolvedValueOnce(membership);
      prismaMock.rolePermission.count.mockResolvedValueOnce(2); // Both permissions match

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
