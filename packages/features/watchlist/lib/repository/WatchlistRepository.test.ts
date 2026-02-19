import type { PrismaClient } from "@calcom/prisma/client";
import { WatchlistAction, WatchlistSource, WatchlistType } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it } from "vitest";
import { type DeepMockProxy, mockDeep, mockReset } from "vitest-mock-extended";
import { WatchlistRepository } from "./WatchlistRepository";

describe("WatchlistRepository", () => {
  let prismaMock: DeepMockProxy<PrismaClient>;
  let repo: WatchlistRepository;

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    repo = new WatchlistRepository(prismaMock);
    mockReset(prismaMock);
  });

  describe("findOrgAndGlobalEntries", () => {
    it("includes only global entries tied to reports from the same organization", async () => {
      const organizationId = 42;
      const now = new Date();

      prismaMock.watchlist.findMany.mockResolvedValue([
        {
          id: "entry-1",
          type: WatchlistType.EMAIL,
          value: "blocked@example.com",
          action: WatchlistAction.BLOCK,
          description: null,
          organizationId: null,
          isGlobal: true,
          source: WatchlistSource.MANUAL,
          lastUpdatedAt: now,
          audits: [{ changedByUserId: 7 }],
        },
      ] as never);
      prismaMock.watchlist.count.mockResolvedValue(1);

      await repo.findOrgAndGlobalEntries({
        organizationId,
        limit: 25,
        offset: 0,
      });

      const expectedOrClause = [
        { organizationId, isGlobal: false },
        {
          isGlobal: true,
          organizationId: null,
          globalBookingReports: {
            some: {
              organizationId,
            },
          },
        },
      ];

      expect(prismaMock.watchlist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expectedOrClause,
          }),
        })
      );
      expect(prismaMock.watchlist.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: expectedOrClause,
        }),
      });
    });
  });
});
