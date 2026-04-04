import type { PrismaClient } from "@calcom/prisma/client";
import { WatchlistAction, WatchlistSource, WatchlistType } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type DeepMockProxy, mockDeep, mockReset } from "vitest-mock-extended";
import { GlobalWatchlistRepository } from "./GlobalWatchlistRepository";

describe("GlobalWatchlistRepository", () => {
  let prismaMock: DeepMockProxy<PrismaClient>;
  let repo: GlobalWatchlistRepository;

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    repo = new GlobalWatchlistRepository(prismaMock);
    mockReset(prismaMock);
  });

  describe("deleteEntry", () => {
    it("should await the prisma delete call", async () => {
      const entryId = "test-entry-id";
      prismaMock.watchlist.delete.mockResolvedValue({} as never);

      await repo.deleteEntry(entryId);

      expect(prismaMock.watchlist.delete).toHaveBeenCalledWith({
        where: { id: entryId },
      });
    });

    it("should propagate errors from prisma delete", async () => {
      const entryId = "test-entry-id";
      prismaMock.watchlist.delete.mockRejectedValue(new Error("Record not found"));

      await expect(repo.deleteEntry(entryId)).rejects.toThrow("Record not found");
    });
  });

  describe("createEntry", () => {
    it("should use provided source instead of defaulting to MANUAL", async () => {
      const mockEntry = {
        id: "new-id",
        type: WatchlistType.EMAIL,
        value: "test@example.com",
        description: "Auto-added during signup review",
        isGlobal: true,
        organizationId: null,
        action: WatchlistAction.BLOCK,
        source: WatchlistSource.SIGNUP,
        lastUpdatedAt: new Date(),
      };
      prismaMock.watchlist.create.mockResolvedValue(mockEntry as never);

      const result = await repo.createEntry({
        type: WatchlistType.EMAIL,
        value: "test@example.com",
        action: WatchlistAction.BLOCK,
        source: WatchlistSource.SIGNUP,
        description: "Auto-added during signup review",
      });

      expect(prismaMock.watchlist.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: WatchlistSource.SIGNUP,
          }),
        })
      );
      expect(result.source).toBe(WatchlistSource.SIGNUP);
    });

    it("should default to MANUAL when source is not provided", async () => {
      const mockEntry = {
        id: "new-id",
        type: WatchlistType.EMAIL,
        value: "test@example.com",
        description: null,
        isGlobal: true,
        organizationId: null,
        action: WatchlistAction.BLOCK,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };
      prismaMock.watchlist.create.mockResolvedValue(mockEntry as never);

      await repo.createEntry({
        type: WatchlistType.EMAIL,
        value: "test@example.com",
        action: WatchlistAction.BLOCK,
      });

      expect(prismaMock.watchlist.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: WatchlistSource.MANUAL,
          }),
        })
      );
    });
  });
});
