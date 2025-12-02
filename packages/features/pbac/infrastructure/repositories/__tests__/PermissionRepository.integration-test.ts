import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest";

import { prisma } from "@calcom/prisma";

import type { PermissionString } from "../../../domain/types/permission-registry";
import { PermissionRepository } from "../PermissionRepository";

describe("PermissionRepository - Integration Tests", () => {
  let repository: PermissionRepository;
  let testRoleId: string;
  let testUserId: number;
  let testTeamId: number;

  beforeAll(async () => {
    repository = new PermissionRepository(prisma);
  });

  beforeEach(async () => {
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        username: `testuser-${Date.now()}`,
      },
    });
    testUserId = testUser.id;

    // Create test team
    const testTeam = await prisma.team.create({
      data: {
        name: `Test Team ${Date.now()}`,
        slug: `test-team-${Date.now()}`,
      },
    });
    testTeamId = testTeam.id;

    // Create test role
    const testRole = await prisma.role.create({
      data: {
        name: `Test Role ${Date.now()}`,
        teamId: testTeamId,
      },
    });
    testRoleId = testRole.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.rolePermission.deleteMany({
      where: { roleId: testRoleId },
    });
    await prisma.membership.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.role.deleteMany({
      where: { id: testRoleId },
    });
    await prisma.team.deleteMany({
      where: { id: testTeamId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
  });

  describe("checkRolePermissions", () => {
    it("should successfully check single permission without serialization error", async () => {
      // Create a role permission
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "role",
          action: "create",
        },
      });

      const permissions: PermissionString[] = ["role.create"];
      const result = await repository.checkRolePermissions(testRoleId, permissions);

      expect(result).toBe(true);
    });

    it("should successfully check multiple permissions without serialization error", async () => {
      // Create multiple role permissions
      await prisma.rolePermission.createMany({
        data: [
          { roleId: testRoleId, resource: "role", action: "create" },
          { roleId: testRoleId, resource: "role", action: "read" },
          { roleId: testRoleId, resource: "eventType", action: "update" },
        ],
      });

      const permissions: PermissionString[] = ["role.create", "role.read", "eventType.update"];
      const result = await repository.checkRolePermissions(testRoleId, permissions);

      expect(result).toBe(true);
    });

    it("should handle exact resource-action pair matching", async () => {
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "team",
          action: "invite",
        },
      });

      const result = await repository.checkRolePermissions(testRoleId, ["team.invite"]);

      expect(result).toBe(true);
    });

    it("should handle wildcard resource (*) with specific action", async () => {
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "*",
          action: "read",
        },
      });

      // Should match any resource with read action
      const result = await repository.checkRolePermissions(testRoleId, [
        "eventType.read",
        "team.read",
        "role.read",
      ]);

      expect(result).toBe(true);
    });

    it("should handle specific resource with wildcard action (*)", async () => {
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "eventType",
          action: "*",
        },
      });

      // Should match eventType with any action
      const result = await repository.checkRolePermissions(testRoleId, [
        "eventType.create",
        "eventType.read",
        "eventType.update",
        "eventType.delete",
      ]);

      expect(result).toBe(true);
    });

    it("should handle universal wildcard (*.*)", async () => {
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "*",
          action: "*",
        },
      });

      // Should match any permission
      const result = await repository.checkRolePermissions(testRoleId, [
        "eventType.create",
        "team.delete",
        "role.update",
      ]);

      expect(result).toBe(true);
    });

    it("should return false when not all permissions are matched", async () => {
      await prisma.rolePermission.createMany({
        data: [
          { roleId: testRoleId, resource: "role", action: "create" },
          { roleId: testRoleId, resource: "role", action: "read" },
        ],
      });

      // Missing eventType.update permission
      const result = await repository.checkRolePermissions(testRoleId, [
        "role.create",
        "role.read",
        "eventType.update",
      ]);

      expect(result).toBe(false);
    });

    it("should return false for empty permissions array", async () => {
      const result = await repository.checkRolePermissions(testRoleId, []);

      expect(result).toBe(false);
    });

    it("should handle complex permission combinations", async () => {
      await prisma.rolePermission.createMany({
        data: [
          { roleId: testRoleId, resource: "*", action: "read" }, // wildcard resource
          { roleId: testRoleId, resource: "eventType", action: "*" }, // wildcard action
          { roleId: testRoleId, resource: "team", action: "invite" }, // exact match
        ],
      });

      // All should match:
      // - role.read matches wildcard resource
      // - eventType.create matches wildcard action for eventType
      // - team.invite matches exact pair
      const result = await repository.checkRolePermissions(testRoleId, [
        "role.read",
        "eventType.create",
        "team.invite",
      ]);

      expect(result).toBe(true);
    });

    it("should handle permission pairs with same resource but different actions", async () => {
      await prisma.rolePermission.createMany({
        data: [
          { roleId: testRoleId, resource: "eventType", action: "create" },
          { roleId: testRoleId, resource: "eventType", action: "update" },
          { roleId: testRoleId, resource: "eventType", action: "delete" },
        ],
      });

      const result = await repository.checkRolePermissions(testRoleId, [
        "eventType.create",
        "eventType.update",
        "eventType.delete",
      ]);

      expect(result).toBe(true);
    });

    it("should handle permission pairs with same action but different resources", async () => {
      await prisma.rolePermission.createMany({
        data: [
          { roleId: testRoleId, resource: "eventType", action: "create" },
          { roleId: testRoleId, resource: "team", action: "create" },
          { roleId: testRoleId, resource: "role", action: "create" },
        ],
      });

      const result = await repository.checkRolePermissions(testRoleId, [
        "eventType.create",
        "team.create",
        "role.create",
      ]);

      expect(result).toBe(true);
    });

    it("should correctly count matching permissions", async () => {
      await prisma.rolePermission.createMany({
        data: [
          { roleId: testRoleId, resource: "eventType", action: "create" },
          { roleId: testRoleId, resource: "eventType", action: "read" },
        ],
      });

      // Only 2 out of 3 permissions match
      const result = await repository.checkRolePermissions(testRoleId, [
        "eventType.create",
        "eventType.read",
        "eventType.update", // This one doesn't match
      ]);

      expect(result).toBe(false);
    });

    it("should handle role with no permissions", async () => {
      const result = await repository.checkRolePermissions(testRoleId, ["eventType.create"]);

      expect(result).toBe(false);
    });

    it("should handle non-existent role", async () => {
      const result = await repository.checkRolePermissions("non-existent-role-id", ["eventType.create"]);

      expect(result).toBe(false);
    });

    it("should reproduce the exact error scenario from the bug report", async () => {
      // Create the exact permission from the error report
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "role",
          action: "create",
        },
      });

      // This is the exact call that was failing
      const permissions: PermissionString[] = ["role.create"];
      const result = await repository.checkRolePermissions(testRoleId, permissions);

      // Should not throw serialization error and should return true
      expect(result).toBe(true);
    });
  });

  describe("checkRolePermission (single)", () => {
    it("should check single permission correctly", async () => {
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "role",
          action: "create",
        },
      });

      const result = await repository.checkRolePermission(testRoleId, "role.create");

      expect(result).toBe(true);
    });

    it("should return false for non-existent permission", async () => {
      const result = await repository.checkRolePermission(testRoleId, "role.create");

      expect(result).toBe(false);
    });
  });

  describe("getUsersWithPermissionInTeam", () => {
    let testUser2Id: number;
    let testUser3Id: number;
    let testRole2Id: string;

    beforeEach(async () => {
      // Create additional test users
      const testUser2 = await prisma.user.create({
        data: {
          email: `test2-${Date.now()}@example.com`,
          username: `testuser2-${Date.now()}`,
          name: "Test User 2",
        },
      });
      testUser2Id = testUser2.id;

      const testUser3 = await prisma.user.create({
        data: {
          email: `test3-${Date.now()}@example.com`,
          username: `testuser3-${Date.now()}`,
          name: "Test User 3",
        },
      });
      testUser3Id = testUser3.id;

      // Create a second test role
      const testRole2 = await prisma.role.create({
        data: {
          name: `Test Role 2 ${Date.now()}`,
          teamId: testTeamId,
        },
      });
      testRole2Id = testRole2.id;
    });

    afterEach(async () => {
      // Clean up additional test data
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [testUser2Id, testUser3Id],
          },
        },
      });
      await prisma.role.deleteMany({
        where: { id: testRole2Id },
      });
    });

    it("should return users with exact permission match", async () => {
      // Create permission and membership
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "eventType",
          action: "create",
        },
      });

      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: testTeamId,
          role: "MEMBER",
          accepted: true,
          customRoleId: testRoleId,
        },
      });

      const result = await repository.getUsersWithPermissionInTeam({
        teamId: testTeamId,
        permission: "eventType.create",
        fallbackRoles: [],
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(testUserId);
      expect(result[0].email).toContain("test-");
      expect(result[0].name).toBeTruthy();
    });

    it("should return multiple users with the same permission", async () => {
      // Create permission
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "team",
          action: "read",
        },
      });

      // Create memberships for multiple users
      await prisma.membership.createMany({
        data: [
          {
            userId: testUserId,
            teamId: testTeamId,
            role: "MEMBER",
            accepted: true,
            customRoleId: testRoleId,
          },
          {
            userId: testUser2Id,
            teamId: testTeamId,
            role: "MEMBER",
            accepted: true,
            customRoleId: testRoleId,
          },
        ],
      });

      const result = await repository.getUsersWithPermissionInTeam({
        teamId: testTeamId,
        permission: "team.read",
        fallbackRoles: [],
      });

      expect(result).toHaveLength(2);
      const userIds = result.map((u) => u.id);
      expect(userIds).toContain(testUserId);
      expect(userIds).toContain(testUser2Id);
    });

    it("should handle wildcard resource (*) with specific action", async () => {
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "*",
          action: "read",
        },
      });

      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: testTeamId,
          role: "MEMBER",
          accepted: true,
          customRoleId: testRoleId,
        },
      });

      // Should match any resource with read action
      const result = await repository.getUsersWithPermissionInTeam({
        teamId: testTeamId,
        permission: "eventType.read",
        fallbackRoles: [],
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(testUserId);
    });

    it("should handle specific resource with wildcard action (*)", async () => {
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "eventType",
          action: "*",
        },
      });

      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: testTeamId,
          role: "MEMBER",
          accepted: true,
          customRoleId: testRoleId,
        },
      });

      // Should match eventType with any action
      const result = await repository.getUsersWithPermissionInTeam({
        teamId: testTeamId,
        permission: "eventType.delete",
        fallbackRoles: [],
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(testUserId);
    });

    it("should handle universal wildcard (*.*)", async () => {
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "*",
          action: "*",
        },
      });

      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: testTeamId,
          role: "MEMBER",
          accepted: true,
          customRoleId: testRoleId,
        },
      });

      // Should match any permission
      const result = await repository.getUsersWithPermissionInTeam({
        teamId: testTeamId,
        permission: "eventType.changeMemberRole",
        fallbackRoles: [],
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(testUserId);
    });

    it("should only return users with accepted memberships", async () => {
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "team",
          action: "update",
        },
      });

      // Create accepted membership
      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: testTeamId,
          role: "MEMBER",
          accepted: true,
          customRoleId: testRoleId,
        },
      });

      // Create pending membership
      await prisma.membership.create({
        data: {
          userId: testUser2Id,
          teamId: testTeamId,
          role: "MEMBER",
          accepted: false,
          customRoleId: testRoleId,
        },
      });

      const result = await repository.getUsersWithPermissionInTeam({
        teamId: testTeamId,
        permission: "team.update",
        fallbackRoles: [],
      });

      // Should only return accepted user
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(testUserId);
    });

    it("should respect the take limit", async () => {
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "role",
          action: "read",
        },
      });

      // Create 3 memberships
      await prisma.membership.createMany({
        data: [
          {
            userId: testUserId,
            teamId: testTeamId,
            role: "MEMBER",
            accepted: true,
            customRoleId: testRoleId,
          },
          {
            userId: testUser2Id,
            teamId: testTeamId,
            role: "MEMBER",
            accepted: true,
            customRoleId: testRoleId,
          },
          {
            userId: testUser3Id,
            teamId: testTeamId,
            role: "MEMBER",
            accepted: true,
            customRoleId: testRoleId,
          },
        ],
      });

      // Request only 2 users
      const result = await repository.getUsersWithPermissionInTeam({
        teamId: testTeamId,
        permission: "role.read",
        fallbackRoles: [],
        take: 2,
      });

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it("should return empty array when no users have permission", async () => {
      const result = await repository.getUsersWithPermissionInTeam({
        teamId: testTeamId,
        permission: "eventType.create",
        fallbackRoles: [],
      });

      expect(result).toHaveLength(0);
    });

    it("should handle fallback roles when PBAC is not enabled", async () => {
      // Create membership with legacy role (no customRoleId)
      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: testTeamId,
          role: "ADMIN",
          accepted: true,
        },
      });

      // Note: In a real test, we would need to ensure PBAC feature flag is NOT set for this team
      // For now, we test that fallbackRoles parameter is used
      const result = await repository.getUsersWithPermissionInTeam({
        teamId: testTeamId,
        permission: "team.create",
        fallbackRoles: ["ADMIN", "OWNER"],
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(testUserId);
    });

    it("should not return users from different teams", async () => {
      // Create another team
      const otherTeam = await prisma.team.create({
        data: {
          name: `Other Team ${Date.now()}`,
          slug: `other-team-${Date.now()}`,
        },
      });

      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "eventType",
          action: "create",
        },
      });

      // Create membership in test team
      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: testTeamId,
          role: "MEMBER",
          accepted: true,
          customRoleId: testRoleId,
        },
      });

      // Create membership in other team
      await prisma.membership.create({
        data: {
          userId: testUser2Id,
          teamId: otherTeam.id,
          role: "MEMBER",
          accepted: true,
          customRoleId: testRoleId,
        },
      });

      const result = await repository.getUsersWithPermissionInTeam({
        teamId: testTeamId,
        permission: "eventType.create",
        fallbackRoles: [],
      });

      // Should only return user from test team
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(testUserId);

      // Cleanup
      await prisma.team.delete({ where: { id: otherTeam.id } });
    });

    it("should deduplicate users when they match both PBAC and fallback criteria", async () => {
      // Create permission
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "team",
          action: "read",
        },
      });

      // Create membership with both customRoleId and legacy role
      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: testTeamId,
          role: "ADMIN",
          accepted: true,
          customRoleId: testRoleId,
        },
      });

      const result = await repository.getUsersWithPermissionInTeam({
        teamId: testTeamId,
        permission: "team.read",
        fallbackRoles: ["ADMIN"],
      });

      // Should return user only once
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(testUserId);
    });
  });
});
