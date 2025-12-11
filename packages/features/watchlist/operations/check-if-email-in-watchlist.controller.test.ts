import { describe, test, expect, vi, beforeEach } from "vitest";

import { WatchlistType } from "@calcom/prisma/enums";

import { WatchlistFeature } from "../lib/facade/WatchlistFeature";
import type { SpanFn } from "../lib/telemetry";
import { checkIfEmailIsBlockedInWatchlistController } from "./check-if-email-in-watchlist.controller";

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

describe("checkIfEmailIsBlockedInWatchlistController", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getWatchlistFeature } = await import("@calcom/features/di/watchlist/containers/watchlist");
    vi.mocked(getWatchlistFeature).mockResolvedValue(mockWatchlistFeature as WatchlistFeature);
  });

  describe("Global blocking only", () => {
    test("should return false when email not blocked globally", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({ isBlocked: false });

      const result = await checkIfEmailIsBlockedInWatchlistController({
        email: "clean@example.com",
      });

      expect(result).toBe(false);
      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalledWith("clean@example.com");
      expect(mockOrgBlocking.isBlocked).not.toHaveBeenCalled();
    });

    test("should return true when email blocked globally", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({
        isBlocked: true,
        reason: WatchlistType.EMAIL,
        watchlistEntry: { id: "123" },
      });

      const result = await checkIfEmailIsBlockedInWatchlistController({
        email: "blocked@example.com",
      });

      expect(result).toBe(true);
      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalledWith("blocked@example.com");
      expect(mockOrgBlocking.isBlocked).not.toHaveBeenCalled(); // Short-circuit
    });

    test("should return true when domain blocked globally", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({
        isBlocked: true,
        reason: WatchlistType.DOMAIN,
        watchlistEntry: { id: "456" },
      });

      const result = await checkIfEmailIsBlockedInWatchlistController({
        email: "user@spam.com",
      });

      expect(result).toBe(true);
      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalledWith("user@spam.com");
    });

    test("should normalize email before checking", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({ isBlocked: false });

      await checkIfEmailIsBlockedInWatchlistController({
        email: "USER@EXAMPLE.COM",
      });

      // Email should be normalized by the time it reaches the service
      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalledWith("user@example.com");
    });
  });

  describe("Organization-specific blocking", () => {
    test("should check org blocklist when organizationId provided", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({ isBlocked: false });
      mockOrgBlocking.isBlocked.mockResolvedValue({ isBlocked: false });

      const result = await checkIfEmailIsBlockedInWatchlistController({
        email: "user@example.com",
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
        watchlistEntry: { id: "org-123" },
      });

      const result = await checkIfEmailIsBlockedInWatchlistController({
        email: "competitor@example.com",
        organizationId: 123,
      });

      expect(result).toBe(true);
      expect(mockOrgBlocking.isBlocked).toHaveBeenCalledWith("competitor@example.com", 123);
    });

    test("should short-circuit on global block (not check org)", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({
        isBlocked: true,
        reason: WatchlistType.EMAIL,
        watchlistEntry: { id: "global-1" },
      });

      const result = await checkIfEmailIsBlockedInWatchlistController({
        email: "spam@example.com",
        organizationId: 123,
      });

      expect(result).toBe(true);
      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalled();
      expect(mockOrgBlocking.isBlocked).not.toHaveBeenCalled(); // Global takes precedence
    });

    test("should handle organizationId as null (explicit no-org)", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({ isBlocked: false });

      const result = await checkIfEmailIsBlockedInWatchlistController({
        email: "user@example.com",
        organizationId: null,
      });

      expect(result).toBe(false);
      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalled();
      expect(mockOrgBlocking.isBlocked).not.toHaveBeenCalled();
    });
  });

  describe("Telemetry (span)", () => {
    test("should call span when provided", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({ isBlocked: false });

      const mockSpan: SpanFn = vi.fn((options, callback) => {
        return Promise.resolve(callback());
      });

      const result = await checkIfEmailIsBlockedInWatchlistController({
        email: "test@example.com",
        span: mockSpan,
      });

      expect(result).toBe(false);
      expect(mockSpan).toHaveBeenCalledWith(
        { name: "checkIfEmailInWatchlist Controller" },
        expect.any(Function)
      );
      expect(mockSpan).toHaveBeenCalledWith(
        { name: "checkIfEmailInWatchlist Presenter", op: "serialize" },
        expect.any(Function)
      );
    });

    test("should not call span when not provided", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({ isBlocked: false });

      const result = await checkIfEmailIsBlockedInWatchlistController({
        email: "test@example.com",
        // No span provided
      });

      expect(result).toBe(false);
      // No span to verify - just ensure it doesn't crash
    });

    test("should execute callback inside span", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({
        isBlocked: true,
        reason: WatchlistType.EMAIL,
      });

      let callbackExecuted = false;
      const mockSpan: SpanFn = vi.fn(async (options, callback) => {
        const result = await callback();
        callbackExecuted = true;
        return result;
      });

      const result = await checkIfEmailIsBlockedInWatchlistController({
        email: "blocked@example.com",
        span: mockSpan,
      });

      expect(result).toBe(true);
      expect(callbackExecuted).toBe(true);
    });
  });

  describe("Edge cases", () => {
    test("should handle whitespace in email", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({ isBlocked: false });

      await checkIfEmailIsBlockedInWatchlistController({
        email: "  user@example.com  ",
      });

      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalledWith("user@example.com");
    });

    test("should handle case-insensitive email", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({ isBlocked: false });

      await checkIfEmailIsBlockedInWatchlistController({
        email: "UsEr@ExAmPlE.CoM",
      });

      expect(mockGlobalBlocking.isBlocked).toHaveBeenCalledWith("user@example.com");
    });

    test("should handle organizationId as undefined", async () => {
      mockGlobalBlocking.isBlocked.mockResolvedValue({ isBlocked: false });

      const result = await checkIfEmailIsBlockedInWatchlistController({
        email: "user@example.com",
        organizationId: undefined,
      });

      expect(result).toBe(false);
      expect(mockOrgBlocking.isBlocked).not.toHaveBeenCalled();
    });
  });
});
