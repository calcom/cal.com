import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";

import type { FeatureId } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import type { PermissionString } from "../../../domain/types/permission-registry";
import { PermissionRepository } from "../PermissionRepository";

describe("PermissionRepository - Integration Tests", () => {
  let repository: PermissionRepository;
  let featuresRepository: FeaturesRepository;
  let testRoleId: string;
  let testUserId: number;
  let testTeamId: number;

  beforeAll(async () => {
    repository = new PermissionRepository(prisma);
    featuresRepository = new FeaturesRepository(prisma);
  });

  beforeEach(async () => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `test-${uniqueId}@example.com`,
        username: `testuser-${uniqueId}`,
      },
    });
    testUserId = testUser.id;

    // Create test team
    const testTeam = await prisma.team.create({
      data: {
        name: `Test Team ${uniqueId}`,
        slug: `test-team-${uniqueId}`,
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
    await featuresRepository.setTeamFeatureState({
      teamId: testTeamId,
      featureId: "pbac" as FeatureId,
      state: "inherit",
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

  describe("getTeamIdsWithPermissions", () => {
    it("should return empty array for empty permissions", async () => {
      const result = await repository.getTeamIdsWithPermissions({
        userId: testUserId,
        permissions: [],
        fallbackRoles: [MembershipRole.ADMIN],
      });

      expect(result).toEqual([]);
    });

    it("should return team IDs for PBAC-enabled team with matching permissions", async () => {
      // Enable PBAC for the team
      await featuresRepository.setTeamFeatureState({
        teamId: testTeamId,
        featureId: "pbac" as FeatureId,
        state: "enabled",
        assignedBy: "test",
      });

      // Create membership with custom role
      const membership = await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: testTeamId,
          role: MembershipRole.MEMBER,
          accepted: true,
          customRoleId: testRoleId,
        },
      });

      // Update membership to ensure customRoleId is set (in case of trigger override)
      await prisma.membership.update({
        where: { id: membership.id },
        data: { customRoleId: testRoleId },
      });

      // Create role permissions
      await prisma.rolePermission.createMany({
        data: [
          { roleId: testRoleId, resource: "eventType", action: "create" },
          { roleId: testRoleId, resource: "eventType", action: "read" },
        ],
      });

      const result = await repository.getTeamIdsWithPermissions({
        userId: testUserId,
        permissions: ["eventType.create", "eventType.read"],
        fallbackRoles: [MembershipRole.ADMIN],
      });

      expect(result).toContain(testTeamId);
      expect(result.length).toBe(1);
    });

    it("should not return team IDs when permissions do not match", async () => {
      // Enable PBAC for the team
      await featuresRepository.setTeamFeatureState({
        teamId: testTeamId,
        featureId: "pbac" as FeatureId,
        state: "enabled",
        assignedBy: "test",
      });

      // Create membership with custom role
      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: testTeamId,
          role: MembershipRole.MEMBER,
          accepted: true,
          customRoleId: testRoleId,
        },
      });

      // Create role permissions (different from requested)
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "eventType",
          action: "create",
        },
      });

      // Request permissions that don't match
      const result = await repository.getTeamIdsWithPermissions({
        userId: testUserId,
        permissions: ["eventType.delete"],
        fallbackRoles: [MembershipRole.ADMIN],
      });

      expect(result).not.toContain(testTeamId);
    });

    it("should return team IDs for fallback roles when PBAC is disabled", async () => {
      // Do NOT enable PBAC for the team (fallback mode)

      // Create membership with fallback role
      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: testTeamId,
          role: MembershipRole.ADMIN,
          accepted: true,
          customRoleId: null,
        },
      });

      const result = await repository.getTeamIdsWithPermissions({
        userId: testUserId,
        permissions: ["eventType.create"],
        fallbackRoles: [MembershipRole.ADMIN],
      });

      expect(result).toContain(testTeamId);
      expect(result.length).toBe(1);
    });

    it("should not return team IDs for fallback roles that are not in the list", async () => {
      // Do NOT enable PBAC for the team

      // Create membership with MEMBER role (not in fallbackRoles)
      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: testTeamId,
          role: MembershipRole.MEMBER,
          accepted: true,
          customRoleId: null,
        },
      });

      const result = await repository.getTeamIdsWithPermissions({
        userId: testUserId,
        permissions: ["eventType.create"],
        fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      });

      expect(result).not.toContain(testTeamId);
    });

    it("should return child team IDs when user has PBAC permissions via org", async () => {
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      // Create organization
      const org = await prisma.team.create({
        data: {
          name: `Test Org ${uniqueId}`,
          slug: `test-org-${uniqueId}`,
          isOrganization: true,
        },
      });

      // Enable PBAC for org
      await featuresRepository.setTeamFeatureState({
        teamId: org.id,
        featureId: "pbac" as FeatureId,
        state: "enabled",
        assignedBy: "test",
      });

      // Create org role
      const orgRole = await prisma.role.create({
        data: {
          name: `Org Role ${uniqueId}`,
          teamId: org.id,
        },
      });

      // Create org membership with custom role
      const orgMembership = await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: org.id,
          role: MembershipRole.MEMBER,
          accepted: true,
          customRoleId: orgRole.id,
        },
      });

      // Update membership to ensure customRoleId is set (in case of trigger override)
      await prisma.membership.update({
        where: { id: orgMembership.id },
        data: { customRoleId: orgRole.id },
      });

      // Create org role permissions
      await prisma.rolePermission.createMany({
        data: [
          { roleId: orgRole.id, resource: "eventType", action: "create" },
          { roleId: orgRole.id, resource: "eventType", action: "read" },
        ],
      });

      // Create child team
      const childTeam = await prisma.team.create({
        data: {
          name: `Child Team ${uniqueId}`,
          slug: `child-team-${uniqueId}`,
          parentId: org.id,
        },
      });

      const result = await repository.getTeamIdsWithPermissions({
        userId: testUserId,
        permissions: ["eventType.create", "eventType.read"],
        fallbackRoles: [MembershipRole.ADMIN],
      });

      expect(result).toContain(childTeam.id);

      // Cleanup
      await prisma.rolePermission.deleteMany({ where: { roleId: orgRole.id } });
      await prisma.membership.deleteMany({ where: { userId: testUserId } });
      await prisma.role.deleteMany({ where: { id: orgRole.id } });
      await featuresRepository.setTeamFeatureState({
        teamId: org.id,
        featureId: "pbac" as FeatureId,
        state: "inherit",
      });
      await prisma.team.deleteMany({ where: { id: { in: [org.id, childTeam.id] } } });
    });

    it("should return child team IDs when user has fallback roles via org", async () => {
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      // Create organization
      const org = await prisma.team.create({
        data: {
          name: `Test Org ${uniqueId}`,
          slug: `test-org-${uniqueId}`,
          isOrganization: true,
        },
      });

      // Do NOT enable PBAC for org

      // Create org membership with fallback role
      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: org.id,
          role: MembershipRole.OWNER,
          accepted: true,
          customRoleId: null,
        },
      });

      // Create child team
      const childTeam = await prisma.team.create({
        data: {
          name: `Child Team ${uniqueId}`,
          slug: `child-team-${uniqueId}`,
          parentId: org.id,
        },
      });

      const result = await repository.getTeamIdsWithPermissions({
        userId: testUserId,
        permissions: ["eventType.create"],
        fallbackRoles: [MembershipRole.OWNER],
      });

      expect(result).toContain(childTeam.id);

      // Cleanup
      await prisma.membership.deleteMany({ where: { userId: testUserId } });
      await prisma.team.deleteMany({ where: { id: { in: [org.id, childTeam.id] } } });
    });

    it("should handle wildcard permissions for PBAC teams", async () => {
      // Enable PBAC for the team
      await featuresRepository.setTeamFeatureState({
        teamId: testTeamId,
        featureId: "pbac" as FeatureId,
        state: "enabled",
        assignedBy: "test",
      });

      // Create membership with custom role
      const membership = await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: testTeamId,
          role: MembershipRole.MEMBER,
          accepted: true,
          customRoleId: testRoleId,
        },
      });

      // Update membership to ensure customRoleId is set (in case of trigger override)
      await prisma.membership.update({
        where: { id: membership.id },
        data: { customRoleId: testRoleId },
      });

      // Create wildcard permission
      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "*",
          action: "*",
        },
      });

      const result = await repository.getTeamIdsWithPermissions({
        userId: testUserId,
        permissions: ["eventType.create", "team.delete", "role.update"],
        fallbackRoles: [MembershipRole.ADMIN],
      });

      expect(result).toContain(testTeamId);
    });

    it("should require all permissions to match (not just some)", async () => {
      // Enable PBAC for the team
      await featuresRepository.setTeamFeatureState({
        teamId: testTeamId,
        featureId: "pbac" as FeatureId,
        state: "enabled",
        assignedBy: "test",
      });

      // Create membership with custom role
      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: testTeamId,
          role: MembershipRole.MEMBER,
          accepted: true,
          customRoleId: testRoleId,
        },
      });

      // Create only 2 out of 3 required permissions
      await prisma.rolePermission.createMany({
        data: [
          { roleId: testRoleId, resource: "eventType", action: "create" },
          { roleId: testRoleId, resource: "eventType", action: "read" },
        ],
      });

      // Request 3 permissions
      const result = await repository.getTeamIdsWithPermissions({
        userId: testUserId,
        permissions: ["eventType.create", "eventType.read", "eventType.delete"],
        fallbackRoles: [MembershipRole.ADMIN],
      });

      expect(result).not.toContain(testTeamId);
    });

    it("should not return teams for non-accepted memberships", async () => {
      // Enable PBAC for the team
      await featuresRepository.setTeamFeatureState({
        teamId: testTeamId,
        featureId: "pbac" as FeatureId,
        state: "enabled",
        assignedBy: "test",
      });

      // Create membership with accepted: false
      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: testTeamId,
          role: MembershipRole.MEMBER,
          accepted: false, // Not accepted
          customRoleId: testRoleId,
        },
      });

      await prisma.rolePermission.create({
        data: {
          roleId: testRoleId,
          resource: "eventType",
          action: "create",
        },
      });

      const result = await repository.getTeamIdsWithPermissions({
        userId: testUserId,
        permissions: ["eventType.create"],
        fallbackRoles: [MembershipRole.ADMIN],
      });

      expect(result).not.toContain(testTeamId);
    });

    it("should return multiple teams when user has permissions on multiple teams", async () => {
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      // Create first team with its own role
      const team1 = await prisma.team.create({
        data: {
          name: `Test Team 1 ${uniqueId}`,
          slug: `test-team-1-${uniqueId}`,
        },
      });

      const role1 = await prisma.role.create({
        data: {
          name: `Test Role 1 ${uniqueId}`,
          teamId: team1.id,
        },
      });

      // Create second team with its own role
      const team2 = await prisma.team.create({
        data: {
          name: `Test Team 2 ${uniqueId}`,
          slug: `test-team-2-${uniqueId}`,
        },
      });

      const role2 = await prisma.role.create({
        data: {
          name: `Test Role 2 ${uniqueId}`,
          teamId: team2.id,
        },
      });

      // Enable PBAC for both teams
      await Promise.all([
        featuresRepository.setTeamFeatureState({
          teamId: team1.id,
          featureId: "pbac" as FeatureId,
          state: "enabled",
          assignedBy: "test",
        }),
        featuresRepository.setTeamFeatureState({
          teamId: team2.id,
          featureId: "pbac" as FeatureId,
          state: "enabled",
          assignedBy: "test",
        }),
      ]);

      // Create memberships for both teams
      const membership1 = await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: team1.id,
          role: MembershipRole.MEMBER,
          accepted: true,
          customRoleId: role1.id,
        },
      });

      const membership2 = await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: team2.id,
          role: MembershipRole.MEMBER,
          accepted: true,
          customRoleId: role2.id,
        },
      });

      // Update memberships to ensure customRoleId is set (in case of trigger override)
      await prisma.membership.updateMany({
        where: {
          id: { in: [membership1.id, membership2.id] },
        },
        data: {
          customRoleId: undefined, // This will be set by the individual updates below
        },
      });

      await prisma.membership.update({
        where: { id: membership1.id },
        data: { customRoleId: role1.id },
      });

      await prisma.membership.update({
        where: { id: membership2.id },
        data: { customRoleId: role2.id },
      });

      // Create permissions for both roles
      await prisma.rolePermission.createMany({
        data: [
          { roleId: role1.id, resource: "eventType", action: "create" },
          { roleId: role2.id, resource: "eventType", action: "create" },
        ],
      });

      const result = await repository.getTeamIdsWithPermissions({
        userId: testUserId,
        permissions: ["eventType.create"],
        fallbackRoles: [MembershipRole.ADMIN],
      });

      expect(result).toContain(team1.id);
      expect(result).toContain(team2.id);
      expect(result.length).toBe(2);

      // Cleanup
      await prisma.rolePermission.deleteMany({ where: { roleId: { in: [role1.id, role2.id] } } });
      await prisma.membership.deleteMany({ where: { userId: testUserId } });
      await prisma.role.deleteMany({ where: { id: { in: [role1.id, role2.id] } } });
      await Promise.all([
        featuresRepository.setTeamFeatureState({
          teamId: team1.id,
          featureId: "pbac" as FeatureId,
          state: "inherit",
        }),
        featuresRepository.setTeamFeatureState({
          teamId: team2.id,
          featureId: "pbac" as FeatureId,
          state: "inherit",
        }),
      ]);
      await prisma.team.deleteMany({ where: { id: { in: [team1.id, team2.id] } } });
    });

    it("should combine PBAC and fallback teams in results", async () => {
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      // Create first team for PBAC
      const team1 = await prisma.team.create({
        data: {
          name: `Test Team 1 ${uniqueId}`,
          slug: `test-team-1-${uniqueId}`,
        },
      });

      const role1 = await prisma.role.create({
        data: {
          name: `Test Role 1 ${uniqueId}`,
          teamId: team1.id,
        },
      });

      // Create second team for fallback
      const team2 = await prisma.team.create({
        data: {
          name: `Test Team 2 ${uniqueId}`,
          slug: `test-team-2-${uniqueId}`,
        },
      });

      // Enable PBAC for first team only
      await featuresRepository.setTeamFeatureState({
        teamId: team1.id,
        featureId: "pbac" as FeatureId,
        state: "enabled",
        assignedBy: "test",
      });

      // Create PBAC membership
      const pbacMembership = await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: team1.id,
          role: MembershipRole.MEMBER,
          accepted: true,
          customRoleId: role1.id,
        },
      });

      // Update membership to ensure customRoleId is set (in case of trigger override)
      await prisma.membership.update({
        where: { id: pbacMembership.id },
        data: { customRoleId: role1.id },
      });

      await prisma.rolePermission.create({
        data: {
          roleId: role1.id,
          resource: "eventType",
          action: "create",
        },
      });

      // Create fallback membership
      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: team2.id,
          role: MembershipRole.ADMIN,
          accepted: true,
          customRoleId: null,
        },
      });

      const result = await repository.getTeamIdsWithPermissions({
        userId: testUserId,
        permissions: ["eventType.create"],
        fallbackRoles: [MembershipRole.ADMIN],
      });

      expect(result).toContain(team1.id);
      expect(result).toContain(team2.id);
      expect(result.length).toBe(2);

      // Cleanup
      await prisma.rolePermission.deleteMany({ where: { roleId: role1.id } });
      await prisma.membership.deleteMany({ where: { userId: testUserId } });
      await prisma.role.deleteMany({ where: { id: role1.id } });
      await featuresRepository.setTeamFeatureState({
        teamId: team1.id,
        featureId: "pbac" as FeatureId,
        state: "inherit",
      });
      await prisma.team.deleteMany({ where: { id: { in: [team1.id, team2.id] } } });
    });

    it("should return empty array when user has no memberships", async () => {
      const result = await repository.getTeamIdsWithPermissions({
        userId: testUserId,
        permissions: ["eventType.create"],
        fallbackRoles: [MembershipRole.ADMIN],
      });

      expect(result).toEqual([]);
    });

    it("should handle multiple fallback roles", async () => {
      // Do NOT enable PBAC

      // Create membership with ADMIN role
      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: testTeamId,
          role: MembershipRole.ADMIN,
          accepted: true,
          customRoleId: null,
        },
      });

      const result = await repository.getTeamIdsWithPermissions({
        userId: testUserId,
        permissions: ["eventType.create"],
        fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      });

      expect(result).toContain(testTeamId);
    });

    it("should filter teams by orgId when provided", async () => {
      // Create two organizations
      const org1 = await prisma.team.create({
        data: {
          name: `Org 1 ${Date.now()}`,
          slug: `org1-${Date.now()}`,
          isOrganization: true,
        },
      });

      const org2 = await prisma.team.create({
        data: {
          name: `Org 2 ${Date.now()}`,
          slug: `org2-${Date.now()}`,
          isOrganization: true,
        },
      });

      // Create teams within each organization
      const team1 = await prisma.team.create({
        data: {
          name: `Team 1 ${Date.now()}`,
          slug: `team1-${Date.now()}`,
          parentId: org1.id,
        },
      });

      const team2 = await prisma.team.create({
        data: {
          name: `Team 2 ${Date.now()}`,
          slug: `team2-${Date.now()}`,
          parentId: org2.id,
        },
      });

      // Create memberships with ADMIN role in both organizations
      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: org1.id,
          role: MembershipRole.ADMIN,
          accepted: true,
        },
      });

      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: org2.id,
          role: MembershipRole.ADMIN,
          accepted: true,
        },
      });

      // Without orgId, should return both organizations
      const resultWithoutScope = await repository.getTeamIdsWithPermissions({
        userId: testUserId,
        permissions: ["eventType.create"],
        fallbackRoles: [MembershipRole.ADMIN],
      });

      expect(resultWithoutScope).toContain(org1.id);
      expect(resultWithoutScope).toContain(org2.id);

      // With orgId = org1, should only return org1 and its child teams
      const resultWithScope = await repository.getTeamIdsWithPermissions({
        userId: testUserId,
        permissions: ["eventType.create"],
        fallbackRoles: [MembershipRole.ADMIN],
        orgId: org1.id,
      });

      expect(resultWithScope).toContain(org1.id);
      expect(resultWithScope).toContain(team1.id);
      expect(resultWithScope).not.toContain(org2.id);
      expect(resultWithScope).not.toContain(team2.id);

      // Cleanup
      await prisma.membership.deleteMany({ where: { userId: testUserId } });
      await prisma.team.deleteMany({ where: { id: { in: [org1.id, org2.id, team1.id, team2.id] } } });
    });

    it("should include child teams when orgId is provided", async () => {
      // Create organization
      const org = await prisma.team.create({
        data: {
          name: `Org ${Date.now()}`,
          slug: `org-${Date.now()}`,
          isOrganization: true,
        },
      });

      // Create child team
      const childTeam = await prisma.team.create({
        data: {
          name: `Child Team ${Date.now()}`,
          slug: `child-team-${Date.now()}`,
          parentId: org.id,
        },
      });

      // Create membership with ADMIN role in organization
      await prisma.membership.create({
        data: {
          userId: testUserId,
          teamId: org.id,
          role: MembershipRole.ADMIN,
          accepted: true,
        },
      });

      // With orgId, should return both org and child team
      const result = await repository.getTeamIdsWithPermissions({
        userId: testUserId,
        permissions: ["eventType.create"],
        fallbackRoles: [MembershipRole.ADMIN],
        orgId: org.id,
      });

      expect(result).toContain(org.id);
      expect(result).toContain(childTeam.id);

      // Cleanup
      await prisma.membership.deleteMany({ where: { userId: testUserId } });
      await prisma.team.deleteMany({ where: { id: { in: [org.id, childTeam.id] } } });
    });
  });
});
