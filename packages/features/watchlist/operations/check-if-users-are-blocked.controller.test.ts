import { describe, test, expect, vi, beforeEach } from "vitest";

import { WatchlistType } from "@calcom/prisma/enums";

import type { SpanFn } from "../lib/telemetry";
import { checkIfUsersAreBlocked } from "./check-if-users-are-blocked.controller";

// Mock the DI container
vi.mock("@calcom/features/di/watchlist/containers/watchlist", () => ({
  getWatchlistFeature: vi.fn(),
}));

const mockGlobalBlocking = {
  isBlocked: vi.fn(),
};

const mockOrgBlocking = {
  isBlocked: vi.fn(),
};

const mockWatchlistFeature = {
  globalBlocking: mockGlobalBlocking,
  orgBlocking: mockOrgBlocking,
  watchlist: {},
  audit: {},
};

describe("checkIfUsersAreBlocked", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getWatchlistFeature } = await import("@calcom/features/di/watchlist/containers/watchlist");
    vi.mocked(getWatchlistFeature).mockResolvedValue(mockWatchlistFeature as never);
  });

  describe("Basic functionality", () => {
    test("should return false when no users are blocked", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({ isBlocked: false });

      const result = await checkIfUsersAreBlocked({
        users: [
          { email: "user1@example.com", username: "user1", locked: false },
          { email: "user2@example.com", username: "user2", locked: false },
        ],
      });

      expect(result).toBe(false);
      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalledTimes(2);
    });

    test("should return true when any user email is blocked globally", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValueOnce({ isBlocked: false }).mockResolvedValueOnce({
        isBlocked: true,
        reason: WatchlistType.EMAIL,
        watchlistEntry: { id: "123" },
      });

      const result = await checkIfUsersAreBlocked({
        users: [
          { email: "clean@example.com", username: "user1", locked: false },
          { email: "blocked@spam.com", username: "user2", locked: false },
        ],
      });

      expect(result).toBe(true);
      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalledWith("clean@example.com");
      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalledWith("blocked@spam.com");
    });

    test("should return true when any user domain is blocked", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValueOnce({ isBlocked: false }).mockResolvedValueOnce({
        isBlocked: true,
        reason: WatchlistType.DOMAIN,
        watchlistEntry: { id: "456" },
      });

      const result = await checkIfUsersAreBlocked({
        users: [
          { email: "user1@clean.com", username: "user1", locked: false },
          { email: "user2@blocked.com", username: "user2", locked: false },
        ],
      });

      expect(result).toBe(true);
    });
  });

  describe("Early exit on locked user", () => {
    test("should return true immediately if user is already locked", async () => {
      const result = await checkIfUsersAreBlocked({
        users: [
          { email: "user1@example.com", username: "user1", locked: true }, // Already locked
          { email: "user2@example.com", username: "user2", locked: false },
        ],
      });

      expect(result).toBe(true);
      expect(mockGlobalBlocking.isBlocked).not.toHaveBeenCalled(); // Should short-circuit
    });

    test("should short-circuit even if locked user is not first", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({ isBlocked: false });

      const result = await checkIfUsersAreBlocked({
        users: [
          { email: "user1@example.com", username: "user1", locked: false },
          { email: "user2@example.com", username: "user2", locked: true }, // Locked user second
        ],
      });

      expect(result).toBe(true);
      expect(mockGlobalBlocking.isBlocked).not.toHaveBeenCalled(); // Still short-circuits with .some()
    });

    test("should not call watchlist if all users are locked", async () => {
      const result = await checkIfUsersAreBlocked({
        users: [
          { email: "user1@example.com", username: "user1", locked: true },
          { email: "user2@example.com", username: "user2", locked: true },
        ],
      });

      expect(result).toBe(true);
      expect(mockGlobalBlocking.isBlocked).not.toHaveBeenCalled();
    });
  });

  describe("Organization-specific blocking", () => {
    test("should check both global and org blocklists", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({ isBlocked: false });
      mockOrgBlocking.isBlocked.mockResolvedValue({ isBlocked: false });

      const result = await checkIfUsersAreBlocked({
        users: [{ email: "user@example.com", username: "user1", locked: false }],
        organizationId: 123,
      });

      expect(result).toBe(false);
      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalledWith("user@example.com");
      expect(mockOrgBlocking.isBlocked).toHaveBeenCalledWith("user@example.com", 123);
    });

    test("should return true when blocked in org blocklist", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({ isBlocked: false });
      mockOrgBlocking.isBlocked.mockResolvedValue({
        isBlocked: true,
        reason: WatchlistType.EMAIL,
      });

      const result = await checkIfUsersAreBlocked({
        users: [{ email: "competitor@example.com", username: "user1", locked: false }],
        organizationId: 123,
      });

      expect(result).toBe(true);
    });

    test("should short-circuit on global block (not check org)", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({
        isBlocked: true,
        reason: WatchlistType.EMAIL,
      });

      const result = await checkIfUsersAreBlocked({
        users: [{ email: "spam@example.com", username: "user1", locked: false }],
        organizationId: 123,
      });

      expect(result).toBe(true);
      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalled();
      expect(mockOrgBlocking.isBlocked).not.toHaveBeenCalled(); // Global block short-circuits
    });
  });

  describe("Email normalization", () => {
    test("should normalize emails before checking", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({ isBlocked: false });

      await checkIfUsersAreBlocked({
        users: [
          { email: "USER1@EXAMPLE.COM", username: "user1", locked: false },
          { email: "  user2@example.com  ", username: "user2", locked: false },
        ],
      });

      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalledWith("user1@example.com");
      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalledWith("user2@example.com");
    });
  });

  describe("Edge cases", () => {
    test("should skip users with no email", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({ isBlocked: false });

      const result = await checkIfUsersAreBlocked({
        users: [
          { email: "", username: "user1", locked: false }, // Empty email
          { email: "user2@example.com", username: "user2", locked: false },
        ],
      });

      expect(result).toBe(false);
      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalledTimes(1); // Only checks user2
      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalledWith("user2@example.com");
    });

    test("should return false for empty users array", async () => {
      const result = await checkIfUsersAreBlocked({
        users: [],
      });

      expect(result).toBe(false);
      expect(mockGlobalBlocking.isBlocked).not.toHaveBeenCalled();
    });

    test("should handle users with null username", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({ isBlocked: false });

      const result = await checkIfUsersAreBlocked({
        users: [{ email: "user@example.com", username: null, locked: false }],
      });

      expect(result).toBe(false);
      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalledWith("user@example.com");
    });
  });

  describe("Telemetry (span)", () => {
    test("should call span when provided", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({ isBlocked: false });

      const mockSpan: SpanFn = vi.fn((options, callback) => {
        return Promise.resolve(callback());
      });

      const result = await checkIfUsersAreBlocked({
        users: [{ email: "test@example.com", username: "test", locked: false }],
        span: mockSpan,
      });

      expect(result).toBe(false);
      expect(mockSpan).toHaveBeenCalledWith(
        { name: "checkIfUsersAreBlocked Controller" },
        expect.any(Function)
      );
      expect(mockSpan).toHaveBeenCalledWith(
        { name: "checkIfUsersAreBlocked Presenter", op: "serialize" },
        expect.any(Function)
      );
    });

    test("should not call span when not provided", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({ isBlocked: false });

      const result = await checkIfUsersAreBlocked({
        users: [{ email: "test@example.com", username: "test", locked: false }],
        // No span provided
      });

      expect(result).toBe(false);
      // No span to verify - just ensure it doesn't crash
    });
  });

  describe("Performance optimization", () => {
    test("should stop checking after finding blocked user", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValueOnce({ isBlocked: false }).mockResolvedValueOnce({
        isBlocked: true,
        reason: WatchlistType.EMAIL,
      });

      const result = await checkIfUsersAreBlocked({
        users: [
          { email: "user1@example.com", username: "user1", locked: false },
          { email: "blocked@example.com", username: "user2", locked: false },
          { email: "user3@example.com", username: "user3", locked: false }, // Should not check this
        ],
      });

      expect(result).toBe(true);
      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalledTimes(2); // Stops after 2nd user
      expect(mockGlobalBlocking.isBlocked).not.toHaveBeenCalledWith("user3@example.com");
    });
  });
});
