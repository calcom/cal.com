import { WatchlistAction, WatchlistSource, WatchlistType } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { SpanFn } from "../lib/telemetry";
import { listAllSystemEntriesController } from "./list-all-system-entries.controller";

// Mock the DI container
vi.mock("@calcom/features/di/watchlist/containers/watchlist", () => ({
  getWatchlistFeature: vi.fn(),
}));

const mockWatchlistService = {
  listAllSystemEntries: vi.fn(),
};

const mockWatchlistFeature: Partial<
  ReturnType<typeof import("../lib/facade/WatchlistFeature").createWatchlistFeature>
> = {
  watchlist: mockWatchlistService as never,
};

describe("listAllSystemEntriesController", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getWatchlistFeature } = await import("@calcom/features/di/watchlist/containers/watchlist");
    vi.mocked(getWatchlistFeature).mockResolvedValue(
      mockWatchlistFeature as ReturnType<typeof getWatchlistFeature>
    );
  });

  describe("Basic functionality", () => {
    test("should return all system entries (global + org)", async () => {
      const mockEntries = [
        {
          id: "1",
          type: WatchlistType.EMAIL,
          value: "global@example.com",
          description: null,
          action: WatchlistAction.BLOCK,
          isGlobal: true,
          organizationId: null,
          source: WatchlistSource.MANUAL,
          lastUpdatedAt: new Date(),
        },
        {
          id: "2",
          type: WatchlistType.DOMAIN,
          value: "@competitor.com",
          description: "Competitor domain",
          action: WatchlistAction.BLOCK,
          isGlobal: false,
          organizationId: 123,
          source: WatchlistSource.MANUAL,
          lastUpdatedAt: new Date(),
        },
      ];

      mockWatchlistService.listAllSystemEntries.mockResolvedValue(mockEntries);

      const result = await listAllSystemEntriesController({});

      expect(result).toEqual(mockEntries);
      expect(result).toHaveLength(2);
      expect(mockWatchlistService.listAllSystemEntries).toHaveBeenCalledTimes(1);
    });

    test("should return empty array when no entries exist", async () => {
      mockWatchlistService.listAllSystemEntries.mockResolvedValue([]);

      const result = await listAllSystemEntriesController({});

      expect(result).toEqual([]);
      expect(mockWatchlistService.listAllSystemEntries).toHaveBeenCalled();
    });
  });

  describe("Entry types", () => {
    test("should return entries of all types (EMAIL, DOMAIN, USERNAME)", async () => {
      const mockEntries = [
        {
          id: "1",
          type: WatchlistType.EMAIL,
          value: "email@example.com",
          description: null,
          action: WatchlistAction.BLOCK,
          isGlobal: true,
          organizationId: null,
          source: WatchlistSource.MANUAL,
          lastUpdatedAt: new Date(),
        },
        {
          id: "2",
          type: WatchlistType.DOMAIN,
          value: "@domain.com",
          description: null,
          action: WatchlistAction.BLOCK,
          isGlobal: true,
          organizationId: null,
          source: WatchlistSource.MANUAL,
          lastUpdatedAt: new Date(),
        },
        {
          id: "3",
          type: WatchlistType.USERNAME,
          value: "spammer123",
          description: null,
          action: WatchlistAction.BLOCK,
          isGlobal: true,
          organizationId: null,
          source: WatchlistSource.MANUAL,
          lastUpdatedAt: new Date(),
        },
      ];

      mockWatchlistService.listAllSystemEntries.mockResolvedValue(mockEntries);

      const result = await listAllSystemEntriesController({});

      expect(result).toHaveLength(3);
      expect(result.map((e) => e.type)).toEqual([
        WatchlistType.EMAIL,
        WatchlistType.DOMAIN,
        WatchlistType.USERNAME,
      ]);
    });

    test("should return entries with different actions (BLOCK, REPORT, ALERT)", async () => {
      const mockEntries = [
        {
          id: "1",
          type: WatchlistType.EMAIL,
          value: "blocked@example.com",
          description: null,
          action: WatchlistAction.BLOCK,
          isGlobal: true,
          organizationId: null,
          source: WatchlistSource.MANUAL,
          lastUpdatedAt: new Date(),
        },
        {
          id: "2",
          type: WatchlistType.EMAIL,
          value: "reported@example.com",
          description: null,
          action: WatchlistAction.REPORT,
          isGlobal: true,
          organizationId: null,
          source: WatchlistSource.MANUAL,
          lastUpdatedAt: new Date(),
        },
        {
          id: "3",
          type: WatchlistType.EMAIL,
          value: "alert@example.com",
          description: null,
          action: WatchlistAction.ALERT,
          isGlobal: true,
          organizationId: null,
          source: WatchlistSource.MANUAL,
          lastUpdatedAt: new Date(),
        },
      ];

      mockWatchlistService.listAllSystemEntries.mockResolvedValue(mockEntries);

      const result = await listAllSystemEntriesController({});

      expect(result.map((e) => e.action)).toEqual([
        WatchlistAction.BLOCK,
        WatchlistAction.REPORT,
        WatchlistAction.ALERT,
      ]);
    });

    test("should return entries with different sources (MANUAL, FREE_DOMAIN_POLICY)", async () => {
      const mockEntries = [
        {
          id: "1",
          type: WatchlistType.EMAIL,
          value: "manual@example.com",
          description: null,
          action: WatchlistAction.BLOCK,
          isGlobal: true,
          organizationId: null,
          source: WatchlistSource.MANUAL,
          lastUpdatedAt: new Date(),
        },
        {
          id: "2",
          type: WatchlistType.DOMAIN,
          value: "@gmail.com",
          description: null,
          action: WatchlistAction.REPORT,
          isGlobal: true,
          organizationId: null,
          source: WatchlistSource.FREE_DOMAIN_POLICY,
          lastUpdatedAt: new Date(),
        },
      ];

      mockWatchlistService.listAllSystemEntries.mockResolvedValue(mockEntries);

      const result = await listAllSystemEntriesController({});

      expect(result.map((e) => e.source)).toEqual([
        WatchlistSource.MANUAL,
        WatchlistSource.FREE_DOMAIN_POLICY,
      ]);
    });
  });

  describe("Multiple organizations", () => {
    test("should return entries from multiple organizations", async () => {
      const mockEntries = [
        {
          id: "1",
          type: WatchlistType.EMAIL,
          value: "org1@example.com",
          description: null,
          action: WatchlistAction.BLOCK,
          isGlobal: false,
          organizationId: 100,
          source: WatchlistSource.MANUAL,
          lastUpdatedAt: new Date(),
        },
        {
          id: "2",
          type: WatchlistType.EMAIL,
          value: "org2@example.com",
          description: null,
          action: WatchlistAction.BLOCK,
          isGlobal: false,
          organizationId: 200,
          source: WatchlistSource.MANUAL,
          lastUpdatedAt: new Date(),
        },
        {
          id: "3",
          type: WatchlistType.EMAIL,
          value: "org3@example.com",
          description: null,
          action: WatchlistAction.BLOCK,
          isGlobal: false,
          organizationId: 300,
          source: WatchlistSource.MANUAL,
          lastUpdatedAt: new Date(),
        },
      ];

      mockWatchlistService.listAllSystemEntries.mockResolvedValue(mockEntries);

      const result = await listAllSystemEntriesController({});

      expect(result).toHaveLength(3);
      const orgIds = result.map((e) => e.organizationId);
      expect(orgIds).toEqual([100, 200, 300]);
      expect(new Set(orgIds).size).toBe(3); // All different orgs
    });
  });

  describe("Telemetry (span)", () => {
    test("should call span when provided", async () => {
      const mockEntries = [
        {
          id: "1",
          type: WatchlistType.EMAIL,
          value: "test@example.com",
          description: null,
          action: WatchlistAction.BLOCK,
          isGlobal: true,
          organizationId: null,
          source: WatchlistSource.MANUAL,
          lastUpdatedAt: new Date(),
        },
      ];

      mockWatchlistService.listAllSystemEntries.mockResolvedValue(mockEntries);

      const mockSpan: SpanFn = vi.fn((options, callback) => {
        return Promise.resolve(callback());
      });

      const result = await listAllSystemEntriesController({
        span: mockSpan,
      });

      expect(result).toEqual(mockEntries);
      expect(mockSpan).toHaveBeenCalledWith(
        { name: "listAllSystemEntries Controller" },
        expect.any(Function)
      );
    });

    test("should not call span when not provided", async () => {
      mockWatchlistService.listAllSystemEntries.mockResolvedValue([]);

      const result = await listAllSystemEntriesController({
        // No span provided
      });

      expect(result).toEqual([]);
      // No span to verify - just ensure it doesn't crash
    });
  });

  describe("Error handling", () => {
    test("should propagate errors from service", async () => {
      const error = new Error("Service error");
      mockWatchlistService.listAllSystemEntries.mockRejectedValue(error);

      await expect(listAllSystemEntriesController({})).rejects.toThrow("Service error");
    });

    test("should propagate errors from service when span is provided", async () => {
      const error = new Error("Service error");
      mockWatchlistService.listAllSystemEntries.mockRejectedValue(error);

      const mockSpan: SpanFn = vi.fn((options, callback) => {
        return Promise.resolve(callback());
      });

      await expect(listAllSystemEntriesController({ span: mockSpan })).rejects.toThrow("Service error");
      expect(mockSpan).toHaveBeenCalled();
    });
  });
});
