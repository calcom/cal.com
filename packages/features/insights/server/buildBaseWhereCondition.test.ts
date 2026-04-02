import type { readonlyPrisma } from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildBaseWhereCondition } from "./buildBaseWhereCondition";

const mockTeamFindMany = vi.fn();
const mockMembershipFindMany = vi.fn();

const mockInsightsDb = {
  team: {
    findMany: mockTeamFindMany,
  },
  membership: {
    findMany: mockMembershipFindMany,
  },
} as unknown as typeof readonlyPrisma;

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
    });
  });

  describe("Organization-wide queries", () => {
    it("should return appropriate where condition when no teams found in organization", async () => {
      mockTeamFindMany.mockResolvedValue([]);

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
            teamId: { in: [100] },
            isTeamBooking: true,
          },
        ],
      });
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
    });

    it("should apply both team and eventTypeId conditions when both are provided", async () => {
      mockMembershipFindMany.mockResolvedValue([{ userId: 301 }, { userId: 302 }]);

      const ctx = createMockContext();

      const result = await buildBaseWhereCondition({
        teamId: 200,
        eventTypeId: 500,
        isAll: false,
        ctx,
      });

      expect(result.whereCondition).toEqual({
        AND: [
          {
            OR: [{ eventTypeId: 500 }, { eventParentId: 500 }],
          },
          {
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
          },
        ],
      });
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
        AND: [
          {
            OR: [{ eventTypeId: 123 }, { eventParentId: 123 }],
          },
          {
            userId: 456,
          },
        ],
      });
    });
  });

  describe("Invalid parameters", () => {
    it("should handle missing parameters and return restrictive where condition", async () => {
      const ctx = createMockContext();

      const result = await buildBaseWhereCondition({
        ctx,
      });

      expect(result.whereCondition).toEqual({ id: -1 });
    });

    it("should handle null teamId with restrictive where condition", async () => {
      const ctx = createMockContext();

      const result = await buildBaseWhereCondition({
        teamId: null,
        ctx,
      });

      expect(result.whereCondition).toEqual({ id: -1 });
    });

    it("should handle empty team members with proper team condition", async () => {
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
    });

    it("should handle rejected team membership differently from empty team", async () => {
      mockMembershipFindMany.mockImplementation((params) => {
        if (params?.where?.accepted === true) {
          // No accepted members
          return Promise.resolve([]);
        }
        return Promise.resolve([{ userId: 601 }, { userId: 602 }]);
      });

      const ctx = createMockContext();

      const result = await buildBaseWhereCondition({
        teamId: 200,
        isAll: false,
        ctx,
      });

      // Should only include team bookings since there are no accepted members
      expect(result.whereCondition).toEqual({
        OR: [
          {
            teamId: 200,
            isTeamBooking: true,
          },
          {
            userId: {
              in: [], // Empty because no accepted members
            },
            isTeamBooking: false,
          },
        ],
      });
    });
  });
});
