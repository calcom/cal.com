import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { prisma } from "@calcom/prisma";

import { RoutingEventsInsights } from "./routing-events";

describe("RoutingEventsInsights", () => {
  class TestRoutingEventsInsights extends RoutingEventsInsights {
    static async testGetWhereForTeamOrAllTeams(params: {
      userId?: number | null;
      teamId?: number | null;
      isAll: boolean;
      organizationId?: number | null;
      routingFormId?: string | null;
    }) {
      return super.getWhereForTeamOrAllTeams(params);
    }
  }

  const testUserId = 9999;
  const testOrgId = 8888;
  const testTeamId1 = 7777;
  const testTeamId2 = 6666;
  const testTeamId3 = 5555;
  const testFormId = "form-test-123";

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: `test-user-${testUserId}@example.com`,
        username: `test-user-${testUserId}`,
        password: "test-password",
      },
    });

    await prisma.team.upsert({
      where: { id: testOrgId },
      update: {},
      create: {
        id: testOrgId,
        name: `Test Organization ${testOrgId}`,
        slug: `test-org-${testOrgId}`,
      },
    });

    await prisma.team.upsert({
      where: { id: testTeamId1 },
      update: { parentId: testOrgId },
      create: {
        id: testTeamId1,
        name: `Test Team ${testTeamId1}`,
        slug: `test-team-${testTeamId1}`,
        parentId: testOrgId,
      },
    });

    await prisma.team.upsert({
      where: { id: testTeamId2 },
      update: { parentId: testOrgId },
      create: {
        id: testTeamId2,
        name: `Test Team ${testTeamId2}`,
        slug: `test-team-${testTeamId2}`,
        parentId: testOrgId,
      },
    });

    await prisma.team.upsert({
      where: { id: testTeamId3 },
      update: {},
      create: {
        id: testTeamId3,
        name: `Test Team ${testTeamId3}`,
        slug: `test-team-${testTeamId3}`,
      },
    });

    await prisma.membership.upsert({
      where: {
        userId_teamId: {
          userId: testUserId,
          teamId: testOrgId,
        },
      },
      update: { accepted: true },
      create: {
        userId: testUserId,
        teamId: testOrgId,
        accepted: true,
        role: "MEMBER",
      },
    });

    await prisma.membership.upsert({
      where: {
        userId_teamId: {
          userId: testUserId,
          teamId: testTeamId1,
        },
      },
      update: { accepted: true },
      create: {
        userId: testUserId,
        teamId: testTeamId1,
        accepted: true,
        role: "MEMBER",
      },
    });

    await prisma.app_RoutingForms_Form.upsert({
      where: { id: testFormId },
      update: { teamId: testTeamId1 },
      create: {
        id: testFormId,
        name: "Test Routing Form",
        userId: testUserId,
        teamId: testTeamId1,
        fields: [],
        routes: [],
      },
    });
  });

  afterAll(async () => {
    await prisma.app_RoutingForms_Form.deleteMany({
      where: { id: testFormId },
    });

    await prisma.membership.deleteMany({
      where: {
        userId: testUserId,
        teamId: { in: [testOrgId, testTeamId1, testTeamId2, testTeamId3] },
      },
    });

    await prisma.team.deleteMany({
      where: { id: { in: [testTeamId1, testTeamId2, testTeamId3, testOrgId] } },
    });

    await prisma.user.delete({
      where: { id: testUserId },
    });
  });

  describe("getWhereForTeamOrAllTeams", () => {
    it("should return correct where condition when isAll is true with organizationId", async () => {
      const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
        userId: testUserId,
        isAll: true,
        organizationId: testOrgId,
      });

      expect(result).toEqual({
        teamId: {
          in: expect.arrayContaining([testOrgId, testTeamId1]),
        },
      });
    });

    it("should return correct where condition when teamId is provided", async () => {
      const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
        userId: testUserId,
        teamId: testTeamId1,
        isAll: false,
      });

      expect(result).toEqual({
        teamId: {
          in: [testTeamId1],
        },
      });
    });

    it("should return correct where condition when neither teamId nor organizationId is provided", async () => {
      const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
        userId: testUserId,
        isAll: false,
      });

      expect(result).toEqual({
        userId: testUserId,
        teamId: null,
      });
    });

    it("should return correct where condition when user has no access to teams", async () => {
      const nonExistentUserId = 12345;

      const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
        userId: nonExistentUserId,
        isAll: true,
        organizationId: testOrgId,
      });

      expect(result).toEqual({
        userId: nonExistentUserId,
        teamId: null,
      });
    });

    it("should return correct where condition when routingFormId is provided", async () => {
      const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
        userId: testUserId,
        teamId: testTeamId1,
        isAll: false,
        routingFormId: testFormId,
      });

      expect(result).toEqual({
        teamId: {
          in: [testTeamId1],
        },
        id: testFormId,
      });
    });

    it("should handle null userId by using default value", async () => {
      const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
        userId: null,
        teamId: testTeamId1,
        isAll: false,
      });

      expect(result).toEqual({
        teamId: {
          in: expect.any(Array),
        },
      });
    });

    it("should handle when isAll is true but no organizationId is provided", async () => {
      const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
        userId: testUserId,
        isAll: true,
      });

      expect(result).toEqual({
        userId: testUserId,
        teamId: null,
      });
    });

    it("should handle when both teamId and organizationId are provided", async () => {
      const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
        userId: testUserId,
        teamId: testTeamId1,
        isAll: false,
        organizationId: testOrgId,
      });

      expect(result).toEqual({
        teamId: {
          in: [testTeamId1],
        },
      });
    });

    it("should handle when both teamId and organizationId are provided with isAll true", async () => {
      const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
        userId: testUserId,
        teamId: testTeamId3, // A team not in the organization
        isAll: true,
        organizationId: testOrgId,
      });

      expect(result).toEqual({
        teamId: {
          in: expect.arrayContaining([testOrgId, testTeamId1]),
        },
      });
    });

    it("should handle empty parameters with only isAll provided", async () => {
      const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
        isAll: false,
      });

      expect(result).toEqual({
        userId: -1,
        teamId: null,
      });
    });

    it("should handle undefined teamId with isAll true", async () => {
      const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
        userId: testUserId,
        teamId: undefined,
        isAll: true,
        organizationId: testOrgId,
      });

      expect(result).toEqual({
        teamId: {
          in: expect.arrayContaining([testOrgId, testTeamId1]),
        },
      });
    });
  });
});
