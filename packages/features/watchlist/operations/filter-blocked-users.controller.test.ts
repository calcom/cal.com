import { describe, test, expect, vi, beforeEach } from "vitest";

import type { SpanFn } from "@calcom/features/watchlist/lib/telemetry";

import { filterBlockedUsers, type UserWithEmail } from "./filter-blocked-users.controller";

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

// Helper to create user objects
function createUser(email: string, locked: boolean, id?: number, username?: string | null): UserWithEmail {
  return {
    id,
    email,
    locked,
    username: username ?? email.split("@")[0],
  };
}

describe("filterBlockedUsers", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getWatchlistFeature } = await import("@calcom/features/di/watchlist/containers/watchlist");
    vi.mocked(getWatchlistFeature).mockResolvedValue(mockWatchlistFeature as never);
  });

  describe("Empty input handling", () => {
    test("should return empty array for empty users array", async () => {
      const result = await filterBlockedUsers([]);

      expect(result).toEqual({ eligibleUsers: [], blockedCount: 0 });
      expect(mockGlobalBlocking.areBlocked).not.toHaveBeenCalled();
    });
  });

  describe("Locked user filtering", () => {
    test("should filter out locked users", async () => {
      const users = [createUser("locked@example.com", true, 1), createUser("unlocked@example.com", false, 2)];

      mockGlobalBlocking.areBlocked.mockResolvedValue(
        new Map([["unlocked@example.com", { isBlocked: false }]])
      );

      const result = await filterBlockedUsers(users);

      expect(result.eligibleUsers).toHaveLength(1);
      expect(result.eligibleUsers[0].email).toBe("unlocked@example.com");
      expect(result.blockedCount).toBe(1);
    });

    test("should filter out all locked users", async () => {
      const users = [createUser("locked1@example.com", true, 1), createUser("locked2@example.com", true, 2)];

      const result = await filterBlockedUsers(users);

      expect(result.eligibleUsers).toHaveLength(0);
      expect(result.blockedCount).toBe(2);
      expect(mockGlobalBlocking.areBlocked).not.toHaveBeenCalled();
    });

    test("should correctly identify locked users regardless of position", async () => {
      const users = [
        createUser("first@example.com", false, 1),
        createUser("locked@example.com", true, 2),
        createUser("last@example.com", false, 3),
      ];

      mockGlobalBlocking.areBlocked.mockResolvedValue(
        new Map([
          ["first@example.com", { isBlocked: false }],
          ["last@example.com", { isBlocked: false }],
        ])
      );

      const result = await filterBlockedUsers(users);

      expect(result.eligibleUsers).toHaveLength(2);
      expect(result.blockedCount).toBe(1);
    });
  });

  describe("Watchlist blocking", () => {
    test("should filter out watchlist-blocked users", async () => {
      const users = [createUser("blocked@spam.com", false, 1), createUser("clean@example.com", false, 2)];

      mockGlobalBlocking.areBlocked.mockResolvedValue(
        new Map([
          ["blocked@spam.com", { isBlocked: true }],
          ["clean@example.com", { isBlocked: false }],
        ])
      );

      const result = await filterBlockedUsers(users);

      expect(result.eligibleUsers).toHaveLength(1);
      expect(result.eligibleUsers[0].email).toBe("clean@example.com");
      expect(result.blockedCount).toBe(1);
    });

    test("should check org-level blocking when organizationId provided", async () => {
      const users = [createUser("user@example.com", false, 1)];

      mockGlobalBlocking.areBlocked.mockResolvedValue(new Map([["user@example.com", { isBlocked: false }]]));
      mockOrgBlocking.areBlocked.mockResolvedValue(new Map([["user@example.com", { isBlocked: true }]]));

      const result = await filterBlockedUsers(users, 123);

      expect(result.eligibleUsers).toHaveLength(0);
      expect(result.blockedCount).toBe(1);
      expect(mockOrgBlocking.areBlocked).toHaveBeenCalledWith(["user@example.com"], 123);
    });

    test("should not check org-level blocking when organizationId is null", async () => {
      const users = [createUser("user@example.com", false, 1)];

      mockGlobalBlocking.areBlocked.mockResolvedValue(new Map([["user@example.com", { isBlocked: false }]]));

      await filterBlockedUsers(users, null);

      expect(mockOrgBlocking.areBlocked).not.toHaveBeenCalled();
    });
  });

  describe("Combined blocking (locked + watchlist)", () => {
    test("should filter out both locked and watchlist-blocked users", async () => {
      const users = [
        createUser("locked@example.com", true, 1),
        createUser("watchlist-blocked@spam.com", false, 2),
        createUser("clean@example.com", false, 3),
      ];

      mockGlobalBlocking.areBlocked.mockResolvedValue(
        new Map([
          ["watchlist-blocked@spam.com", { isBlocked: true }],
          ["clean@example.com", { isBlocked: false }],
        ])
      );

      const result = await filterBlockedUsers(users);

      expect(result.eligibleUsers).toHaveLength(1);
      expect(result.eligibleUsers[0].email).toBe("clean@example.com");
      expect(result.blockedCount).toBe(2);
    });

    test("should handle complex scenario with mixed blocking reasons", async () => {
      const users = [
        createUser("locked1@example.com", true, 1),
        createUser("global-blocked@spam.com", false, 2),
        createUser("org-blocked@competitor.com", false, 3),
        createUser("clean1@example.com", false, 4),
        createUser("locked2@example.com", true, 5),
        createUser("clean2@example.com", false, 6),
      ];

      mockGlobalBlocking.areBlocked.mockResolvedValue(
        new Map([
          ["global-blocked@spam.com", { isBlocked: true }],
          ["org-blocked@competitor.com", { isBlocked: false }],
          ["clean1@example.com", { isBlocked: false }],
          ["clean2@example.com", { isBlocked: false }],
        ])
      );
      mockOrgBlocking.areBlocked.mockResolvedValue(
        new Map([
          ["global-blocked@spam.com", { isBlocked: false }],
          ["org-blocked@competitor.com", { isBlocked: true }],
          ["clean1@example.com", { isBlocked: false }],
          ["clean2@example.com", { isBlocked: false }],
        ])
      );

      const result = await filterBlockedUsers(users, 123);

      expect(result.eligibleUsers).toHaveLength(2);
      expect(result.eligibleUsers.map((u) => u.email)).toEqual(["clean1@example.com", "clean2@example.com"]);
      expect(result.blockedCount).toBe(4); // 2 locked + 1 global + 1 org
    });
  });

  describe("Preserves user data", () => {
    test("should preserve all user properties in returned eligible users", async () => {
      interface ExtendedUser extends UserWithEmail {
        metadata: Record<string, unknown>;
        credentials: unknown[];
      }

      const users: ExtendedUser[] = [
        {
          id: 1,
          email: "user@example.com",
          locked: false,
          username: "testuser",
          metadata: { key: "value" },
          credentials: [{ type: "google" }],
        },
      ];

      mockGlobalBlocking.areBlocked.mockResolvedValue(new Map([["user@example.com", { isBlocked: false }]]));

      const result = await filterBlockedUsers(users);

      expect(result.eligibleUsers).toHaveLength(1);
      expect(result.eligibleUsers[0]).toEqual({
        id: 1,
        email: "user@example.com",
        locked: false,
        username: "testuser",
        metadata: { key: "value" },
        credentials: [{ type: "google" }],
      });
    });

    test("should handle users with null username", async () => {
      const users: UserWithEmail[] = [
        {
          id: 1,
          email: "user@example.com",
          locked: false,
          username: null,
        },
      ];

      mockGlobalBlocking.areBlocked.mockResolvedValue(new Map([["user@example.com", { isBlocked: false }]]));

      const result = await filterBlockedUsers(users);

      expect(result.eligibleUsers).toHaveLength(1);
      expect(result.eligibleUsers[0].username).toBeNull();
    });
  });

  describe("Email edge cases", () => {
    test("should handle emails with different cases", async () => {
      const users = [createUser("USER@EXAMPLE.COM", false, 1)];

      mockGlobalBlocking.areBlocked.mockResolvedValue(new Map([["user@example.com", { isBlocked: true }]]));

      const result = await filterBlockedUsers(users);

      expect(result.eligibleUsers).toHaveLength(0);
      expect(result.blockedCount).toBe(1);
    });

    test("should handle emails with whitespace", async () => {
      const users = [createUser("  user@example.com  ", false, 1)];

      mockGlobalBlocking.areBlocked.mockResolvedValue(new Map([["user@example.com", { isBlocked: false }]]));

      const result = await filterBlockedUsers(users);

      expect(result.eligibleUsers).toHaveLength(1);
    });
  });

  describe("Performance: batched checks", () => {
    test("should make single batch call for multiple users", async () => {
      const users = [
        createUser("user1@example.com", false, 1),
        createUser("user2@example.com", false, 2),
        createUser("user3@example.com", false, 3),
      ];

      mockGlobalBlocking.areBlocked.mockResolvedValue(
        new Map([
          ["user1@example.com", { isBlocked: false }],
          ["user2@example.com", { isBlocked: false }],
          ["user3@example.com", { isBlocked: false }],
        ])
      );

      await filterBlockedUsers(users);

      // Should be called once with all emails, not 3 times
      expect(mockGlobalBlocking.areBlocked).toHaveBeenCalledTimes(1);
      expect(mockGlobalBlocking.areBlocked).toHaveBeenCalledWith([
        "user1@example.com",
        "user2@example.com",
        "user3@example.com",
      ]);
    });

    test("should not call watchlist for locked-only users", async () => {
      const users = [createUser("locked1@example.com", true, 1), createUser("locked2@example.com", true, 2)];

      await filterBlockedUsers(users);

      expect(mockGlobalBlocking.areBlocked).not.toHaveBeenCalled();
    });
  });

  describe("Telemetry (span)", () => {
    test("should call span when provided", async () => {
      const users = [createUser("user@example.com", false, 1)];

      mockGlobalBlocking.areBlocked.mockResolvedValue(new Map([["user@example.com", { isBlocked: false }]]));

      const mockSpan: SpanFn = vi.fn((_options, callback) => {
        return Promise.resolve(callback());
      });

      const result = await filterBlockedUsers(users, null, mockSpan);

      expect(result.eligibleUsers).toHaveLength(1);
      expect(mockSpan).toHaveBeenCalledWith({ name: "filterBlockedUsers Controller" }, expect.any(Function));
    });

    test("should work without span", async () => {
      const users = [createUser("user@example.com", false, 1)];

      mockGlobalBlocking.areBlocked.mockResolvedValue(new Map([["user@example.com", { isBlocked: false }]]));

      // Should not throw when span is not provided
      const result = await filterBlockedUsers(users);

      expect(result.eligibleUsers).toHaveLength(1);
    });
  });
});
