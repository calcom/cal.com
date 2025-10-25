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
});
