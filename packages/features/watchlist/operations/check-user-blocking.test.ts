import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  type BlockableUser,
  type BlockingInfo,
  checkWatchlistBlocking,
  getBlockedUsersMap,
  isUserBlocked,
} from "./check-user-blocking";

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

describe("check-user-blocking", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getWatchlistFeature } = await import("@calcom/features/di/watchlist/containers/watchlist");
    vi.mocked(getWatchlistFeature).mockResolvedValue(mockWatchlistFeature as never);
  });

  describe("getBlockedUsersMap", () => {
    describe("Empty input handling", () => {
      test("should return empty result for empty users array", async () => {
        const result = await getBlockedUsersMap([]);

        expect(result).toEqual({
          blockingMap: new Map(),
          blockedCount: 0,
          lockedCount: 0,
          watchlistBlockedCount: 0,
        });
        expect(mockGlobalBlocking.areBlocked).not.toHaveBeenCalled();
      });

      test("should skip users with empty emails", async () => {
        mockGlobalBlocking.areBlocked.mockResolvedValue(
          new Map([["valid@example.com", { isBlocked: false }]])
        );

        const users: BlockableUser[] = [
          { email: "", locked: false },
          { email: "   ", locked: false },
          { email: "valid@example.com", locked: false },
        ];

        const result = await getBlockedUsersMap(users);

        expect(result.blockedCount).toBe(0);
        expect(mockGlobalBlocking.areBlocked).toHaveBeenCalledWith(["valid@example.com"]);
      });

      test("should return empty result if all users have empty emails", async () => {
        const users: BlockableUser[] = [
          { email: "", locked: false },
          { email: "   ", locked: false },
        ];

        const result = await getBlockedUsersMap(users);

        expect(result).toEqual({
          blockingMap: new Map(),
          blockedCount: 0,
          lockedCount: 0,
          watchlistBlockedCount: 0,
        });
        expect(mockGlobalBlocking.areBlocked).not.toHaveBeenCalled();
      });
    });

    describe("Locked user blocking", () => {
      test("should block locked users without calling watchlist", async () => {
        const users: BlockableUser[] = [
          { email: "locked@example.com", locked: true },
          { email: "unlocked@example.com", locked: false },
        ];

        mockGlobalBlocking.areBlocked.mockResolvedValue(
          new Map([["unlocked@example.com", { isBlocked: false }]])
        );

        const result = await getBlockedUsersMap(users);

        expect(result.blockedCount).toBe(1);
        expect(result.lockedCount).toBe(1);
        expect(result.watchlistBlockedCount).toBe(0);

        const lockedInfo = result.blockingMap.get("locked@example.com");
        expect(lockedInfo).toEqual({ isBlocked: true, reason: "locked" });

        // Should only check unlocked user in watchlist
        expect(mockGlobalBlocking.areBlocked).toHaveBeenCalledWith(["unlocked@example.com"]);
      });

      test("should not call watchlist if all users are locked", async () => {
        const users: BlockableUser[] = [
          { email: "locked1@example.com", locked: true },
          { email: "locked2@example.com", locked: true },
        ];

        const result = await getBlockedUsersMap(users);

        expect(result.blockedCount).toBe(2);
        expect(result.lockedCount).toBe(2);
        expect(result.watchlistBlockedCount).toBe(0);
        expect(mockGlobalBlocking.areBlocked).not.toHaveBeenCalled();
      });

      test("should correctly count multiple locked users", async () => {
        const users: BlockableUser[] = [
          { email: "locked1@example.com", locked: true },
          { email: "locked2@example.com", locked: true },
          { email: "locked3@example.com", locked: true },
        ];

        const result = await getBlockedUsersMap(users);

        expect(result.lockedCount).toBe(3);
        expect(result.blockedCount).toBe(3);
      });
    });

    describe("Watchlist blocking", () => {
      test("should block users on global watchlist", async () => {
        const users: BlockableUser[] = [
          { email: "blocked@spam.com", locked: false },
          { email: "clean@example.com", locked: false },
        ];

        mockGlobalBlocking.areBlocked.mockResolvedValue(
          new Map([
            ["blocked@spam.com", { isBlocked: true }],
            ["clean@example.com", { isBlocked: false }],
          ])
        );

        const result = await getBlockedUsersMap(users);

        expect(result.blockedCount).toBe(1);
        expect(result.lockedCount).toBe(0);
        expect(result.watchlistBlockedCount).toBe(1);

        const blockedInfo = result.blockingMap.get("blocked@spam.com");
        expect(blockedInfo).toEqual({ isBlocked: true, reason: "watchlist" });

        const cleanInfo = result.blockingMap.get("clean@example.com");
        expect(cleanInfo).toEqual({ isBlocked: false });
      });

      test("should check org-level blocking when organizationId is provided", async () => {
        const users: BlockableUser[] = [{ email: "user@example.com", locked: false }];

        mockGlobalBlocking.areBlocked.mockResolvedValue(
          new Map([["user@example.com", { isBlocked: false }]])
        );
        mockOrgBlocking.areBlocked.mockResolvedValue(new Map([["user@example.com", { isBlocked: true }]]));

        const result = await getBlockedUsersMap(users, 123);

        expect(result.blockedCount).toBe(1);
        expect(result.watchlistBlockedCount).toBe(1);
        expect(mockOrgBlocking.areBlocked).toHaveBeenCalledWith(["user@example.com"], 123);
      });

      test("should not check org-level blocking when organizationId is not provided", async () => {
        const users: BlockableUser[] = [{ email: "user@example.com", locked: false }];

        mockGlobalBlocking.areBlocked.mockResolvedValue(
          new Map([["user@example.com", { isBlocked: false }]])
        );

        await getBlockedUsersMap(users);

        expect(mockOrgBlocking.areBlocked).not.toHaveBeenCalled();
      });

      test("should not check org-level blocking when organizationId is null", async () => {
        const users: BlockableUser[] = [{ email: "user@example.com", locked: false }];

        mockGlobalBlocking.areBlocked.mockResolvedValue(
          new Map([["user@example.com", { isBlocked: false }]])
        );

        await getBlockedUsersMap(users, null);

        expect(mockOrgBlocking.areBlocked).not.toHaveBeenCalled();
      });
    });

    describe("Combined blocking (locked + watchlist)", () => {
      test("should correctly count both locked and watchlist-blocked users", async () => {
        const users: BlockableUser[] = [
          { email: "locked@example.com", locked: true },
          { email: "watchlist-blocked@spam.com", locked: false },
          { email: "clean@example.com", locked: false },
        ];

        mockGlobalBlocking.areBlocked.mockResolvedValue(
          new Map([
            ["watchlist-blocked@spam.com", { isBlocked: true }],
            ["clean@example.com", { isBlocked: false }],
          ])
        );

        const result = await getBlockedUsersMap(users);

        expect(result.blockedCount).toBe(2);
        expect(result.lockedCount).toBe(1);
        expect(result.watchlistBlockedCount).toBe(1);
      });

      test("should prioritize locked status over watchlist (locked users not checked in watchlist)", async () => {
        const users: BlockableUser[] = [
          { email: "locked-and-would-be-blocked@spam.com", locked: true },
          { email: "clean@example.com", locked: false },
        ];

        mockGlobalBlocking.areBlocked.mockResolvedValue(
          new Map([["clean@example.com", { isBlocked: false }]])
        );

        const result = await getBlockedUsersMap(users);

        // The locked user's email should NOT be sent to watchlist check
        expect(mockGlobalBlocking.areBlocked).toHaveBeenCalledWith(["clean@example.com"]);
        expect(mockGlobalBlocking.areBlocked).not.toHaveBeenCalledWith(
          expect.arrayContaining(["locked-and-would-be-blocked@spam.com"])
        );

        // But the locked user should still be marked as blocked
        const lockedInfo = result.blockingMap.get("locked-and-would-be-blocked@spam.com");
        expect(lockedInfo).toEqual({ isBlocked: true, reason: "locked" });
      });
    });

    describe("Email normalization", () => {
      test("should normalize emails to lowercase", async () => {
        const users: BlockableUser[] = [{ email: "USER@EXAMPLE.COM", locked: false }];

        mockGlobalBlocking.areBlocked.mockResolvedValue(
          new Map([["user@example.com", { isBlocked: false }]])
        );

        const result = await getBlockedUsersMap(users);

        expect(result.blockingMap.has("user@example.com")).toBe(true);
        expect(result.blockingMap.has("USER@EXAMPLE.COM")).toBe(false);
      });

      test("should trim whitespace from emails", async () => {
        const users: BlockableUser[] = [{ email: "  user@example.com  ", locked: false }];

        mockGlobalBlocking.areBlocked.mockResolvedValue(
          new Map([["user@example.com", { isBlocked: false }]])
        );

        const result = await getBlockedUsersMap(users);

        expect(result.blockingMap.has("user@example.com")).toBe(true);
      });
    });
  });

  describe("isUserBlocked", () => {
    test("should return true for blocked user", () => {
      const blockingMap = new Map<string, BlockingInfo>([
        ["blocked@example.com", { isBlocked: true, reason: "locked" }],
      ]);

      expect(isUserBlocked("blocked@example.com", blockingMap)).toBe(true);
    });

    test("should return false for non-blocked user", () => {
      const blockingMap = new Map<string, BlockingInfo>([["clean@example.com", { isBlocked: false }]]);

      expect(isUserBlocked("clean@example.com", blockingMap)).toBe(false);
    });

    test("should return false for user not in map", () => {
      const blockingMap = new Map<string, BlockingInfo>();

      expect(isUserBlocked("unknown@example.com", blockingMap)).toBe(false);
    });

    test("should return false for empty email", () => {
      const blockingMap = new Map<string, BlockingInfo>([
        ["blocked@example.com", { isBlocked: true, reason: "locked" }],
      ]);

      expect(isUserBlocked("", blockingMap)).toBe(false);
      expect(isUserBlocked("   ", blockingMap)).toBe(false);
    });

    test("should normalize email before lookup", () => {
      const blockingMap = new Map<string, BlockingInfo>([
        ["blocked@example.com", { isBlocked: true, reason: "locked" }],
      ]);

      expect(isUserBlocked("BLOCKED@EXAMPLE.COM", blockingMap)).toBe(true);
      expect(isUserBlocked("  blocked@example.com  ", blockingMap)).toBe(true);
    });
  });

  describe("checkWatchlistBlocking", () => {
    test("should batch check all emails against global watchlist", async () => {
      const emails = ["user1@example.com", "user2@example.com"];

      mockGlobalBlocking.areBlocked.mockResolvedValue(
        new Map([
          ["user1@example.com", { isBlocked: false }],
          ["user2@example.com", { isBlocked: true }],
        ])
      );

      const result = await checkWatchlistBlocking(emails);

      expect(mockGlobalBlocking.areBlocked).toHaveBeenCalledWith(emails);
      expect(result.get("user1@example.com")).toBe(false);
      expect(result.get("user2@example.com")).toBe(true);
    });

    test("should combine global and org blocking results", async () => {
      const emails = ["user@example.com"];

      mockGlobalBlocking.areBlocked.mockResolvedValue(new Map([["user@example.com", { isBlocked: false }]]));
      mockOrgBlocking.areBlocked.mockResolvedValue(new Map([["user@example.com", { isBlocked: true }]]));

      const result = await checkWatchlistBlocking(emails, 123);

      expect(result.get("user@example.com")).toBe(true);
    });

    test("should block if either global or org blocks", async () => {
      const emails = ["global-blocked@example.com", "org-blocked@example.com", "clean@example.com"];

      mockGlobalBlocking.areBlocked.mockResolvedValue(
        new Map([
          ["global-blocked@example.com", { isBlocked: true }],
          ["org-blocked@example.com", { isBlocked: false }],
          ["clean@example.com", { isBlocked: false }],
        ])
      );
      mockOrgBlocking.areBlocked.mockResolvedValue(
        new Map([
          ["global-blocked@example.com", { isBlocked: false }],
          ["org-blocked@example.com", { isBlocked: true }],
          ["clean@example.com", { isBlocked: false }],
        ])
      );

      const result = await checkWatchlistBlocking(emails, 123);

      expect(result.get("global-blocked@example.com")).toBe(true);
      expect(result.get("org-blocked@example.com")).toBe(true);
      expect(result.get("clean@example.com")).toBe(false);
    });

    test("should normalize emails in result map", async () => {
      const emails = ["USER@EXAMPLE.COM"];

      mockGlobalBlocking.areBlocked.mockResolvedValue(new Map([["user@example.com", { isBlocked: true }]]));

      const result = await checkWatchlistBlocking(emails);

      expect(result.get("user@example.com")).toBe(true);
    });
  });
});
