import { describe, it, expect, vi, beforeEach } from "vitest";

import { excludeSoftDeletedTeams } from "./exclude-soft-deleted-teams";

describe("excludeSoftDeletedTeams", () => {
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockQuery = vi.fn().mockResolvedValue({ id: 1, name: "Test Team" });
  });

  describe("automatic soft delete filtering", () => {
    it("should add deletedAt: null filter when no deletedAt is specified", async () => {
      const args = { where: { id: 1 } };
      await excludeSoftDeletedTeams(args, mockQuery);

      expect(mockQuery).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
      });
    });

    it("should add deletedAt: null filter when where clause is empty", async () => {
      const args = { where: {} };
      await excludeSoftDeletedTeams(args, mockQuery);

      expect(mockQuery).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it("should add deletedAt: null filter when where clause is undefined", async () => {
      const args = {};
      await excludeSoftDeletedTeams(args, mockQuery);

      expect(mockQuery).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });
  });

  describe("bypass soft delete filter when deletedAt is explicitly specified", () => {
    it("should NOT add deletedAt: null when deletedAt is already in where clause", async () => {
      const args = {
        where: {
          deletedAt: { not: null },
        },
      };
      await excludeSoftDeletedTeams(args, mockQuery);

      expect(mockQuery).toHaveBeenCalledWith({
        where: { deletedAt: { not: null } },
      });
    });

    it("should NOT add deletedAt: null when deletedAt is explicitly set to a date filter", async () => {
      const cutoffDate = new Date();
      const args = {
        where: {
          deletedAt: { not: null, lt: cutoffDate },
        },
      };
      await excludeSoftDeletedTeams(args, mockQuery);

      expect(mockQuery).toHaveBeenCalledWith({
        where: { deletedAt: { not: null, lt: cutoffDate } },
      });
    });

    it("should NOT add deletedAt: null when deletedAt is explicitly set to null", async () => {
      const args = {
        where: {
          id: 1,
          deletedAt: null,
        },
      };
      await excludeSoftDeletedTeams(args, mockQuery);

      expect(mockQuery).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
      });
    });
  });

  describe("complex where clauses", () => {
    it("should add deletedAt: null to complex where clauses with nested conditions", async () => {
      const args = {
        where: {
          OR: [{ slug: "team-1" }, { slug: "team-2" }],
          isOrganization: true,
        },
      };
      await excludeSoftDeletedTeams(args, mockQuery);

      expect(mockQuery).toHaveBeenCalledWith({
        where: {
          OR: [{ slug: "team-1" }, { slug: "team-2" }],
          isOrganization: true,
          deletedAt: null,
        },
      });
    });

    it("should preserve existing filters when adding deletedAt: null", async () => {
      const args = {
        where: {
          id: 1,
          members: { some: { userId: 123 } },
        },
      };
      await excludeSoftDeletedTeams(args, mockQuery);

      expect(mockQuery).toHaveBeenCalledWith({
        where: {
          id: 1,
          members: { some: { userId: 123 } },
          deletedAt: null,
        },
      });
    });

    it("should handle where clause with parentId filter", async () => {
      const args = {
        where: {
          parentId: 1,
        },
      };
      await excludeSoftDeletedTeams(args, mockQuery);

      expect(mockQuery).toHaveBeenCalledWith({
        where: {
          parentId: 1,
          deletedAt: null,
        },
      });
    });
  });

  describe("return value", () => {
    it("should return the result from the query function", async () => {
      const expectedResult = { id: 1, name: "Test Team", slug: "test-team" };
      mockQuery.mockResolvedValue(expectedResult);

      const args = { where: { id: 1 } };
      const result = await excludeSoftDeletedTeams(args, mockQuery);

      expect(result).toEqual(expectedResult);
    });

    it("should return null when query returns null", async () => {
      mockQuery.mockResolvedValue(null);

      const args = { where: { id: 999 } };
      const result = await excludeSoftDeletedTeams(args, mockQuery);

      expect(result).toBeNull();
    });
  });
});
