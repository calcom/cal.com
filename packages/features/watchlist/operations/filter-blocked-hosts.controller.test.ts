import { describe, test, expect, vi, beforeEach } from "vitest";

import { filterBlockedHosts, type HostWithEmail } from "./filter-blocked-hosts.controller";

vi.mock("@calcom/features/di/watchlist/containers/watchlist", () => ({
  getWatchlistFeature: vi.fn(),
}));

const mockGlobalBlocking: { areBlocked: ReturnType<typeof vi.fn> } = {
  areBlocked: vi.fn(),
};

const mockOrgBlocking: { areBlocked: ReturnType<typeof vi.fn> } = {
  areBlocked: vi.fn(),
};

const mockWatchlistFeature: {
  globalBlocking: typeof mockGlobalBlocking;
  orgBlocking: typeof mockOrgBlocking;
  watchlist: Record<string, unknown>;
  audit: Record<string, unknown>;
} = {
  globalBlocking: mockGlobalBlocking,
  orgBlocking: mockOrgBlocking,
  watchlist: {},
  audit: {},
};

// Helper to create host objects
function createHost(id: number, email: string, locked: boolean): HostWithEmail {
  return {
    user: { id, email, locked },
  };
}

describe("filterBlockedHosts", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getWatchlistFeature } = await import("@calcom/features/di/watchlist/containers/watchlist");
    vi.mocked(getWatchlistFeature).mockResolvedValue(mockWatchlistFeature as never);
  });

  describe("Empty input handling", () => {
    test("should return empty array for empty hosts array", async () => {
      const result = await filterBlockedHosts([]);

      expect(result).toEqual({ eligibleHosts: [], blockedCount: 0 });
      expect(mockGlobalBlocking.areBlocked).not.toHaveBeenCalled();
    });
  });

  describe("Locked host filtering", () => {
    test("should filter out locked hosts", async () => {
      const hosts = [createHost(1, "locked@example.com", true), createHost(2, "unlocked@example.com", false)];

      mockGlobalBlocking.areBlocked.mockResolvedValue(
        new Map([["unlocked@example.com", { isBlocked: false }]])
      );

      const result = await filterBlockedHosts(hosts);

      expect(result.eligibleHosts).toHaveLength(1);
      expect(result.eligibleHosts[0].user.id).toBe(2);
      expect(result.blockedCount).toBe(1);
    });

    test("should filter out all locked hosts", async () => {
      const hosts = [createHost(1, "locked1@example.com", true), createHost(2, "locked2@example.com", true)];

      const result = await filterBlockedHosts(hosts);

      expect(result.eligibleHosts).toHaveLength(0);
      expect(result.blockedCount).toBe(2);
      expect(mockGlobalBlocking.areBlocked).not.toHaveBeenCalled();
    });
  });

  describe("Watchlist blocking", () => {
    test("should filter out watchlist-blocked hosts", async () => {
      const hosts = [createHost(1, "blocked@spam.com", false), createHost(2, "clean@example.com", false)];

      mockGlobalBlocking.areBlocked.mockResolvedValue(
        new Map([
          ["blocked@spam.com", { isBlocked: true }],
          ["clean@example.com", { isBlocked: false }],
        ])
      );

      const result = await filterBlockedHosts(hosts);

      expect(result.eligibleHosts).toHaveLength(1);
      expect(result.eligibleHosts[0].user.id).toBe(2);
      expect(result.blockedCount).toBe(1);
    });

    test("should check org-level blocking when organizationId provided", async () => {
      const hosts = [createHost(1, "user@example.com", false)];

      mockGlobalBlocking.areBlocked.mockResolvedValue(new Map([["user@example.com", { isBlocked: false }]]));
      mockOrgBlocking.areBlocked.mockResolvedValue(new Map([["user@example.com", { isBlocked: true }]]));

      const result = await filterBlockedHosts(hosts, 123);

      expect(result.eligibleHosts).toHaveLength(0);
      expect(result.blockedCount).toBe(1);
      expect(mockOrgBlocking.areBlocked).toHaveBeenCalledWith(["user@example.com"], 123);
    });
  });

  describe("Combined blocking (locked + watchlist)", () => {
    test("should filter out both locked and watchlist-blocked hosts", async () => {
      const hosts = [
        createHost(1, "locked@example.com", true),
        createHost(2, "watchlist-blocked@spam.com", false),
        createHost(3, "clean@example.com", false),
      ];

      mockGlobalBlocking.areBlocked.mockResolvedValue(
        new Map([
          ["watchlist-blocked@spam.com", { isBlocked: true }],
          ["clean@example.com", { isBlocked: false }],
        ])
      );

      const result = await filterBlockedHosts(hosts);

      expect(result.eligibleHosts).toHaveLength(1);
      expect(result.eligibleHosts[0].user.id).toBe(3);
      expect(result.blockedCount).toBe(2);
    });
  });

  describe("Preserves host data", () => {
    test("should preserve all host properties in returned eligible hosts", async () => {
      interface ExtendedHost extends HostWithEmail {
        isFixed: boolean;
        priority: number;
      }

      const hosts: ExtendedHost[] = [
        {
          user: { id: 1, email: "host@example.com", locked: false },
          isFixed: true,
          priority: 10,
        },
      ];

      mockGlobalBlocking.areBlocked.mockResolvedValue(new Map([["host@example.com", { isBlocked: false }]]));

      const result = await filterBlockedHosts(hosts);

      expect(result.eligibleHosts).toHaveLength(1);
      expect(result.eligibleHosts[0]).toEqual({
        user: { id: 1, email: "host@example.com", locked: false },
        isFixed: true,
        priority: 10,
      });
    });
  });

  describe("Email normalization", () => {
    test("should handle emails with different cases", async () => {
      const hosts = [createHost(1, "USER@EXAMPLE.COM", false)];

      mockGlobalBlocking.areBlocked.mockResolvedValue(new Map([["user@example.com", { isBlocked: true }]]));

      const result = await filterBlockedHosts(hosts);

      expect(result.eligibleHosts).toHaveLength(0);
      expect(result.blockedCount).toBe(1);
    });
  });

  describe("Performance: batched checks", () => {
    test("should make single batch call for multiple hosts", async () => {
      const hosts = [
        createHost(1, "user1@example.com", false),
        createHost(2, "user2@example.com", false),
        createHost(3, "user3@example.com", false),
      ];

      mockGlobalBlocking.areBlocked.mockResolvedValue(
        new Map([
          ["user1@example.com", { isBlocked: false }],
          ["user2@example.com", { isBlocked: false }],
          ["user3@example.com", { isBlocked: false }],
        ])
      );

      await filterBlockedHosts(hosts);

      // Should be called once with all emails, not 3 times
      expect(mockGlobalBlocking.areBlocked).toHaveBeenCalledTimes(1);
      expect(mockGlobalBlocking.areBlocked).toHaveBeenCalledWith([
        "user1@example.com",
        "user2@example.com",
        "user3@example.com",
      ]);
    });

    test("should not call watchlist for locked-only hosts", async () => {
      const hosts = [createHost(1, "locked1@example.com", true), createHost(2, "locked2@example.com", true)];

      await filterBlockedHosts(hosts);

      expect(mockGlobalBlocking.areBlocked).not.toHaveBeenCalled();
    });
  });
});
