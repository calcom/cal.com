import { describe, expect, it, vi, beforeEach } from "vitest";

import { buildBaseWhereCondition } from "../trpc-router";

const mockTeamFindMany = vi.fn();
const mockMembershipFindMany = vi.fn();

const mockInsightsDb = {
  team: {
    findMany: mockTeamFindMany,
  },
  membership: {
    findMany: mockMembershipFindMany,
  },
};

const createMockContext = (overrides = {}) => ({
  userIsOwnerAdminOfParentTeam: false,
  userOrganizationId: null,
  insightsDb: mockInsightsDb,
  ...overrides,
});

describe("buildBaseWhereCondition", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("Basic filtering", () => {
    it("should set eventTypeId condition when eventTypeId is provided", async () => {
      const ctx = createMockContext();
      const result = await buildBaseWhereCondition({
        eventTypeId: 123,
        ctx,
      });

      expect(result.whereCondition).toEqual({
        OR: [{ eventTypeId: 123 }, { eventParentId: 123 }],
      });
      expect(mockTeamFindMany).not.toHaveBeenCalled();
      expect(mockMembershipFindMany).not.toHaveBeenCalled();
    });

    it("should set userId condition when memberUserId is provided", async () => {
      const ctx = createMockContext();
      const result = await buildBaseWhereCondition({
        memberUserId: 456,
        ctx,
      });

      expect(result.whereCondition).toEqual({
        userId: 456,
      });
      expect(mockTeamFindMany).not.toHaveBeenCalled();
      expect(mockMembershipFindMany).not.toHaveBeenCalled();
    });

    it("should set userId and teamId conditions when userId is provided", async () => {
      const ctx = createMockContext();
      const result = await buildBaseWhereCondition({
        userId: 789,
        ctx,
      });

      expect(result.whereCondition).toEqual({
        userId: 789,
        teamId: null,
      });
      expect(mockTeamFindMany).not.toHaveBeenCalled();
      expect(mockMembershipFindMany).not.toHaveBeenCalled();
    });
  });

  describe("Organization-wide queries", () => {
    it("should return isEmptyResponse when no teams found in organization", async () => {
      mockTeamFindMany.mockResolvedValue([]);

      const ctx = createMockContext({
        userIsOwnerAdminOfParentTeam: true,
        userOrganizationId: 100,
      });

      const result = await buildBaseWhereCondition({
        isAll: true,
        ctx,
      });

      expect(result.isEmptyResponse).toBe(true);
      expect(result.whereCondition).toEqual({
        OR: [
          {
            teamId: 100,
            isTeamBooking: true,
          },
        ],
      });
      expect(mockTeamFindMany).toHaveBeenCalledWith({
        where: {
          parentId: 100,
        },
        select: {
          id: true,
        },
      });
      expect(mockMembershipFindMany).not.toHaveBeenCalled();
    });

    it("should build complex where condition for organization-wide query", async () => {
      mockTeamFindMany.mockResolvedValue([{ id: 101 }, { id: 102 }]);
      mockMembershipFindMany.mockResolvedValue([{ userId: 201 }, { userId: 202 }]);

      const ctx = createMockContext({
        userIsOwnerAdminOfParentTeam: true,
        userOrganizationId: 100,
      });

      const result = await buildBaseWhereCondition({
        isAll: true,
        ctx,
      });

      expect(result.whereCondition).toEqual({
        OR: [
          {
            teamId: {
              in: [100, 101, 102],
            },
            isTeamBooking: true,
          },
          {
            userId: {
              in: [201, 202],
            },
            isTeamBooking: false,
          },
        ],
      });
      expect(mockTeamFindMany).toHaveBeenCalledWith({
        where: {
          parentId: 100,
        },
        select: {
          id: true,
        },
      });
      expect(mockMembershipFindMany).toHaveBeenCalledWith({
        where: {
          team: {
            id: {
              in: [100, 101, 102],
            },
          },
          accepted: true,
        },
        select: {
          userId: true,
        },
      });
    });
  });

  describe("Team-specific queries", () => {
    it("should build where condition for team-specific query", async () => {
      mockMembershipFindMany.mockResolvedValue([{ userId: 301 }, { userId: 302 }]);

      const ctx = createMockContext();

      const result = await buildBaseWhereCondition({
        teamId: 200,
        isAll: false,
        ctx,
      });

      expect(result.whereCondition).toEqual({
        OR: [
          {
            teamId: 200,
            isTeamBooking: true,
          },
          {
            userId: {
              in: [301, 302],
            },
            isTeamBooking: false,
          },
        ],
      });
      expect(mockTeamFindMany).not.toHaveBeenCalled();
      expect(mockMembershipFindMany).toHaveBeenCalledWith({
        where: {
          teamId: 200,
          accepted: true,
        },
        select: {
          userId: true,
        },
      });
    });

    it("should not build team-specific where condition when eventTypeId is provided", async () => {
      const ctx = createMockContext();

      const result = await buildBaseWhereCondition({
        teamId: 200,
        eventTypeId: 500,
        isAll: false,
        ctx,
      });

      expect(result.whereCondition).toEqual({
        OR: [{ eventTypeId: 500 }, { eventParentId: 500 }],
      });
      expect(mockTeamFindMany).not.toHaveBeenCalled();
      expect(mockMembershipFindMany).not.toHaveBeenCalled();
    });
  });

  describe("Combined filtering", () => {
    it("should combine eventTypeId and memberUserId conditions", async () => {
      const ctx = createMockContext();

      const result = await buildBaseWhereCondition({
        eventTypeId: 123,
        memberUserId: 456,
        ctx,
      });

      expect(result.whereCondition).toEqual({
        OR: [{ eventTypeId: 123 }, { eventParentId: 123 }],
        userId: 456,
      });
      expect(mockTeamFindMany).not.toHaveBeenCalled();
      expect(mockMembershipFindMany).not.toHaveBeenCalled();
    });
  });

  describe("Invalid parameters", () => {
    it("should handle missing parameters and return empty where condition", async () => {
      const ctx = createMockContext();

      const result = await buildBaseWhereCondition({
        ctx,
      });

      expect(result.whereCondition).toEqual({});
      expect(mockTeamFindMany).not.toHaveBeenCalled();
      expect(mockMembershipFindMany).not.toHaveBeenCalled();
    });

    it("should handle null teamId", async () => {
      const ctx = createMockContext();

      const result = await buildBaseWhereCondition({
        teamId: null,
        ctx,
      });

      expect(result.whereCondition).toEqual({});
      expect(mockTeamFindMany).not.toHaveBeenCalled();
      expect(mockMembershipFindMany).not.toHaveBeenCalled();
    });

    it("should handle empty team members", async () => {
      mockMembershipFindMany.mockResolvedValue([]);

      const ctx = createMockContext();

      const result = await buildBaseWhereCondition({
        teamId: 200,
        isAll: false,
        ctx,
      });

      expect(result.whereCondition).toEqual({
        OR: [
          {
            teamId: 200,
            isTeamBooking: true,
          },
          {
            userId: {
              in: [],
            },
            isTeamBooking: false,
          },
        ],
      });
      expect(mockTeamFindMany).not.toHaveBeenCalled();
      expect(mockMembershipFindMany).toHaveBeenCalledWith({
        where: {
          teamId: 200,
          accepted: true,
        },
        select: {
          userId: true,
        },
      });
    });

    it("should handle rejected team membership", async () => {
      mockMembershipFindMany.mockResolvedValue([]);

      const ctx = createMockContext();

      const result = await buildBaseWhereCondition({
        teamId: 200,
        isAll: false,
        ctx,
      });

      expect(result.whereCondition).toEqual({
        OR: [
          {
            teamId: 200,
            isTeamBooking: true,
          },
          {
            userId: {
              in: [],
            },
            isTeamBooking: false,
          },
        ],
      });
      expect(mockTeamFindMany).not.toHaveBeenCalled();
      expect(mockMembershipFindMany).toHaveBeenCalledWith({
        where: {
          teamId: 200,
          accepted: true,
        },
        select: {
          userId: true,
        },
      });
    });
  });
});
