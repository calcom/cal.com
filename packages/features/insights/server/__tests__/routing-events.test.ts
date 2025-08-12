import { describe, expect, it, vi, beforeEach } from "vitest";

import { readonlyPrisma } from "@calcom/prisma";

import { RoutingEventsInsights } from "../routing-events";

vi.mock("@calcom/prisma", () => ({
  readonlyPrisma: {
    team: {
      findMany: vi.fn(),
    },
    membership: {
      findMany: vi.fn(),
    },
  },
}));

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

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getWhereForTeamOrAllTeams", () => {
    describe("Basic filtering scenarios", () => {
      it("should return correct where condition when isAll is true with organizationId", async () => {
        vi.mocked(readonlyPrisma.team.findMany).mockResolvedValue([{ id: 1 }, { id: 2 }]);
        vi.mocked(readonlyPrisma.membership.findMany).mockResolvedValue([{ teamId: 1 }, { teamId: 2 }]);

        const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
          userId: 1,
          isAll: true,
          organizationId: 1,
        });

        expect(result).toEqual({
          teamId: {
            in: [1, 2],
          },
        });
      });

      it("should return correct where condition when teamId is provided", async () => {
        vi.mocked(readonlyPrisma.membership.findMany).mockResolvedValue([{ teamId: 5 }]);

        const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
          userId: 1,
          teamId: 5,
          isAll: false,
        });

        expect(result).toEqual({
          teamId: {
            in: [5],
          },
        });
      });

      it("should return correct where condition when neither teamId nor organizationId is provided", async () => {
        const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
          userId: 1,
          isAll: false,
        });

        expect(result).toEqual({
          userId: 1,
          teamId: null,
        });
      });
    });

    describe("Edge cases", () => {
      it("should return correct where condition when user has no access to teams", async () => {
        vi.mocked(readonlyPrisma.team.findMany).mockResolvedValue([{ id: 2 }, { id: 3 }]);
        vi.mocked(readonlyPrisma.membership.findMany).mockResolvedValue([]);

        const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
          userId: 1,
          isAll: true,
          organizationId: 1,
        });

        expect(result).toEqual({
          userId: 1,
          teamId: null,
        });
      });

      it("should return correct where condition when routingFormId is provided", async () => {
        vi.mocked(readonlyPrisma.membership.findMany).mockResolvedValue([{ teamId: 5 }]);

        const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
          userId: 1,
          teamId: 5,
          isAll: false,
          routingFormId: "form-123",
        });

        expect(result).toEqual({
          teamId: {
            in: [5],
          },
          id: "form-123",
        });
      });

      it("should handle null userId by using default value", async () => {
        vi.mocked(readonlyPrisma.membership.findMany).mockResolvedValue([{ teamId: 5 }]);

        const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
          userId: null,
          teamId: 5,
          isAll: false,
        });

        expect(result).toEqual({
          teamId: {
            in: [5],
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
    });

    describe("Invalid parameter combinations", () => {
      it("should handle when isAll is true but no organizationId is provided", async () => {
        const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
          userId: 1,
          isAll: true,
        });

        expect(result).toEqual({
          userId: 1,
          teamId: null,
        });
      });

      it("should handle when both teamId and organizationId are provided", async () => {
        vi.mocked(readonlyPrisma.membership.findMany).mockResolvedValue([{ teamId: 5 }]);

        const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
          userId: 1,
          teamId: 5,
          isAll: false,
          organizationId: 10,
        });

        expect(result).toEqual({
          teamId: {
            in: [5],
          },
        });
      });

      it("should handle when both teamId and organizationId are provided with isAll true", async () => {
        vi.mocked(readonlyPrisma.team.findMany).mockResolvedValue([{ id: 1 }, { id: 2 }]);
        vi.mocked(readonlyPrisma.membership.findMany).mockResolvedValue([{ teamId: 1 }, { teamId: 2 }]);

        const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
          userId: 1,
          teamId: 5,
          isAll: true,
          organizationId: 1,
        });

        expect(result).toEqual({
          teamId: {
            in: [1, 2],
          },
        });
      });

      it("should handle undefined teamId with isAll true", async () => {
        vi.mocked(readonlyPrisma.team.findMany).mockResolvedValue([]);
        vi.mocked(readonlyPrisma.membership.findMany).mockResolvedValue([]);

        const result = await TestRoutingEventsInsights.testGetWhereForTeamOrAllTeams({
          userId: 1,
          teamId: undefined,
          isAll: true,
          organizationId: 1,
        });

        expect(result).toEqual({
          userId: 1,
          teamId: null,
        });
      });
    });
  });
});
