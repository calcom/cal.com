import { WatchlistAction, WatchlistType } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ScheduleBlockingService } from "./ScheduleBlockingService";

/**
 * Tests for ScheduleBlockingService.
 *
 * Key behavior tested:
 * - Blocking schedules when a user is added to watchlist
 * - Unblocking schedules ONLY when no other blocking entries remain
 * - A user blocked by both email AND domain should remain blocked when only one entry is removed
 */

describe("ScheduleBlockingService", () => {
  let service: ScheduleBlockingService;
  let mockPrisma: {
    schedule: { updateMany: ReturnType<typeof vi.fn> };
    user: { findMany: ReturnType<typeof vi.fn> };
    watchlist: { findFirst: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    mockPrisma = {
      schedule: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([{ email: "john@example.com" }]),
      },
      watchlist: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    service = new ScheduleBlockingService(mockPrisma as never);
  });

  describe("blockSchedulesByEmail", () => {
    it("should block schedules for matching email", async () => {
      const result = await service.blockSchedulesByEmail("john@example.com");

      expect(mockPrisma.schedule.updateMany).toHaveBeenCalledWith({
        where: {
          user: {
            OR: [{ email: "john@example.com" }, { secondaryEmails: { some: { email: "john@example.com" } } }],
          },
        },
        data: { blockedByWatchlist: true },
      });
      expect(result.count).toBe(1);
    });

    it("should normalize email to lowercase", async () => {
      await service.blockSchedulesByEmail("JOHN@EXAMPLE.COM");

      expect(mockPrisma.schedule.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            user: {
              OR: [
                { email: "john@example.com" },
                { secondaryEmails: { some: { email: "john@example.com" } } },
              ],
            },
          },
        })
      );
    });
  });

  describe("blockSchedulesByDomain", () => {
    it("should block schedules for matching domain", async () => {
      const result = await service.blockSchedulesByDomain("example.com");

      expect(mockPrisma.schedule.updateMany).toHaveBeenCalledWith({
        where: {
          user: {
            OR: [
              { email: { endsWith: "@example.com" } },
              { secondaryEmails: { some: { email: { endsWith: "@example.com" } } } },
            ],
          },
        },
        data: { blockedByWatchlist: true },
      });
      expect(result.count).toBe(1);
    });
  });

  describe("unblockSchedulesByEmail - Multiple Blocking Entries", () => {
    it("should NOT unblock if user is still blocked by domain entry", async () => {
      // User john@example.com is blocked by BOTH email AND domain
      // When email block is removed, domain block should still keep them blocked
      mockPrisma.watchlist.findFirst.mockResolvedValue({
        id: "domain-block-id",
        type: WatchlistType.DOMAIN,
        value: "example.com",
        action: WatchlistAction.BLOCK,
      });

      const result = await service.unblockSchedulesByEmail("john@example.com");

      // Should NOT update schedules because user is still blocked by domain
      expect(mockPrisma.schedule.updateMany).not.toHaveBeenCalled();
      expect(result.count).toBe(0);
    });

    it("should unblock if no other blocking entries remain", async () => {
      // User john@example.com only has email block, no domain block
      mockPrisma.watchlist.findFirst.mockResolvedValue(null);

      const result = await service.unblockSchedulesByEmail("john@example.com");

      expect(mockPrisma.schedule.updateMany).toHaveBeenCalledWith({
        where: {
          user: {
            email: { in: ["john@example.com"] },
          },
        },
        data: { blockedByWatchlist: false },
      });
      expect(result.count).toBe(1);
    });

    it("should return count 0 if no users match the email", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.unblockSchedulesByEmail("nonexistent@example.com");

      expect(mockPrisma.schedule.updateMany).not.toHaveBeenCalled();
      expect(result.count).toBe(0);
    });
  });

  describe("unblockSchedulesByDomain - Multiple Blocking Entries", () => {
    it("should NOT unblock if user is still blocked by specific email entry", async () => {
      // User john@example.com is blocked by BOTH email AND domain
      // When domain block is removed, email block should still keep them blocked
      mockPrisma.watchlist.findFirst.mockResolvedValue({
        id: "email-block-id",
        type: WatchlistType.EMAIL,
        value: "john@example.com",
        action: WatchlistAction.BLOCK,
      });

      const result = await service.unblockSchedulesByDomain("example.com");

      // Should NOT update schedules because user is still blocked by email
      expect(mockPrisma.schedule.updateMany).not.toHaveBeenCalled();
      expect(result.count).toBe(0);
    });

    it("should unblock if no other blocking entries remain", async () => {
      // User john@example.com only has domain block, no email block
      mockPrisma.watchlist.findFirst.mockResolvedValue(null);

      const result = await service.unblockSchedulesByDomain("example.com");

      expect(mockPrisma.schedule.updateMany).toHaveBeenCalledWith({
        where: {
          user: {
            email: { in: ["john@example.com"] },
          },
        },
        data: { blockedByWatchlist: false },
      });
      expect(result.count).toBe(1);
    });

    it("should handle mixed scenarios - some users unblocked, others remain blocked", async () => {
      // Two users from same domain: john@example.com and jane@example.com
      // john is also blocked by specific email entry, jane is only blocked by domain
      mockPrisma.user.findMany.mockResolvedValue([
        { email: "john@example.com" },
        { email: "jane@example.com" },
      ]);

      // First call for john - still blocked by email
      // Second call for jane - not blocked by anything else
      mockPrisma.watchlist.findFirst
        .mockResolvedValueOnce({
          id: "email-block-id",
          type: WatchlistType.EMAIL,
          value: "john@example.com",
          action: WatchlistAction.BLOCK,
        })
        .mockResolvedValueOnce(null);

      const result = await service.unblockSchedulesByDomain("example.com");

      // Should only unblock jane, not john
      expect(mockPrisma.schedule.updateMany).toHaveBeenCalledWith({
        where: {
          user: {
            email: { in: ["jane@example.com"] },
          },
        },
        data: { blockedByWatchlist: false },
      });
      expect(result.count).toBe(1);
    });
  });

  describe("isUserStillBlocked checks both email and domain", () => {
    it("should check for matching email entry", async () => {
      await service.unblockSchedulesByEmail("john@example.com");

      // Should query for both email match AND domain match
      expect(mockPrisma.watchlist.findFirst).toHaveBeenCalledWith({
        where: {
          action: WatchlistAction.BLOCK,
          OR: [
            { type: WatchlistType.EMAIL, value: "john@example.com" },
            { type: WatchlistType.DOMAIN, value: "example.com" },
          ],
        },
        select: { id: true },
      });
    });
  });
});
