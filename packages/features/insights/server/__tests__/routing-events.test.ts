import { describe, expect, it, vi, beforeEach } from "vitest";

import { readonlyPrisma } from "@calcom/prisma";

import { InsightsAuthRepository } from "../repositories/insights-auth.repository";

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

describe("InsightsAuthRepository", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getWhereForTeamOrAllTeams", () => {
    describe("Basic filtering scenarios", () => {
      it("should return correct where condition when isAll is true with organizationId", async () => {
        vi.mocked(readonlyPrisma.team.findMany).mockResolvedValue([{ id: 1 }, { id: 2 }]);
        vi.mocked(readonlyPrisma.membership.findMany).mockResolvedValue([{ teamId: 1 }, { teamId: 2 }]);

        const result = await InsightsAuthRepository.getWhereForTeamOrAllTeams({
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

        const result = await InsightsAuthRepository.getWhereForTeamOrAllTeams({
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
        const result = await InsightsAuthRepository.getWhereForTeamOrAllTeams({
          userId: 1,
          isAll: false,
        });

        expect(result).toEqual({
          userId: 1,
          teamId: undefined,
        });
      });
    });

    describe("Edge cases", () => {
      it("should return correct where condition when user has no access to teams", async () => {
        vi.mocked(readonlyPrisma.team.findMany).mockResolvedValue([{ id: 2 }, { id: 3 }]);
        vi.mocked(readonlyPrisma.membership.findMany).mockResolvedValue([]);

        const result = await InsightsAuthRepository.getWhereForTeamOrAllTeams({
          userId: 1,
          isAll: true,
          organizationId: 1,
        });

        expect(result).toEqual({
          userId: 1,
          teamId: undefined,
        });
      });

      it("should return correct where condition when routingFormId is provided", async () => {
        vi.mocked(readonlyPrisma.membership.findMany).mockResolvedValue([{ teamId: 5 }]);

        const result = await InsightsAuthRepository.getWhereForTeamOrAllTeams({
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
        const result = await InsightsAuthRepository.getWhereForTeamOrAllTeams({
          userId: null,
          teamId: 5,
          isAll: false,
        });

        expect(result).toEqual({
          teamId: undefined,
        });
      });

      it("should handle empty parameters with only isAll provided", async () => {
        const result = await InsightsAuthRepository.getWhereForTeamOrAllTeams({
          isAll: false,
        });

        expect(result).toEqual({
          teamId: undefined,
        });
      });
    });

    describe("Invalid parameter combinations", () => {
      it("should handle when isAll is true but no organizationId is provided", async () => {
        const result = await InsightsAuthRepository.getWhereForTeamOrAllTeams({
          userId: 1,
          isAll: true,
        });

        expect(result).toEqual({
          userId: 1,
          teamId: undefined,
        });
      });

      it("should handle when both teamId and organizationId are provided", async () => {
        vi.mocked(readonlyPrisma.membership.findMany).mockResolvedValue([{ teamId: 5 }]);

        const result = await InsightsAuthRepository.getWhereForTeamOrAllTeams({
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

        const result = await InsightsAuthRepository.getWhereForTeamOrAllTeams({
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

        const result = await InsightsAuthRepository.getWhereForTeamOrAllTeams({
          userId: 1,
          teamId: undefined,
          isAll: true,
          organizationId: 1,
        });

        expect(result).toEqual({
          userId: 1,
          teamId: undefined,
        });
      });
    });
  });

  describe("getAccessibleTeamIds", () => {
    it("should return accessible team IDs for organization", async () => {
      vi.mocked(readonlyPrisma.team.findMany).mockResolvedValue([{ id: 2 }, { id: 3 }]);
      vi.mocked(readonlyPrisma.membership.findMany).mockResolvedValue([{ teamId: 1 }, { teamId: 2 }]);

      const result = await InsightsAuthRepository.getAccessibleTeamIds({
        userId: 1,
        organizationId: 1,
      });

      expect(result).toEqual([1, 2]);
      expect(readonlyPrisma.team.findMany).toHaveBeenCalledWith({
        where: { parentId: 1 },
        select: { id: true },
      });
      expect(readonlyPrisma.membership.findMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          teamId: { in: [1, 2, 3] },
          accepted: true,
        },
        select: { teamId: true },
      });
    });

    it("should handle null userId", async () => {
      const result = await InsightsAuthRepository.getAccessibleTeamIds({
        userId: null,
        organizationId: 1,
      });

      expect(result).toEqual([]);
      expect(readonlyPrisma.membership.findMany).not.toHaveBeenCalled();
    });
  });

  describe("getAccessibleTeamIdsForTeam", () => {
    it("should return accessible team IDs for specific team", async () => {
      vi.mocked(readonlyPrisma.membership.findMany).mockResolvedValue([{ teamId: 5 }]);

      const result = await InsightsAuthRepository.getAccessibleTeamIdsForTeam({
        userId: 1,
        teamId: 5,
      });

      expect(result).toEqual([5]);
      expect(readonlyPrisma.membership.findMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          teamId: 5,
          accepted: true,
        },
        select: { teamId: true },
      });
    });

    it("should handle null userId for team access", async () => {
      const result = await InsightsAuthRepository.getAccessibleTeamIdsForTeam({
        userId: null,
        teamId: 5,
      });

      expect(result).toEqual([]);
      expect(readonlyPrisma.membership.findMany).not.toHaveBeenCalled();
    });
  });
});
