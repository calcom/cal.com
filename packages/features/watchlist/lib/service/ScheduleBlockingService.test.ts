import type { ScheduleRepository } from "@calcom/features/schedules/repositories/ScheduleRepository";
import type { SecondaryEmailRepository } from "@calcom/features/users/repositories/SecondaryEmailRepository";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WatchlistRepository } from "../repository/WatchlistRepository";
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
  let mockUserRepo: Partial<UserRepository>;
  let mockSecondaryEmailRepo: Partial<SecondaryEmailRepository>;
  let mockScheduleRepo: Partial<ScheduleRepository>;
  let mockWatchlistRepo: Partial<WatchlistRepository>;

  beforeEach(() => {
    mockUserRepo = {
      findUserIdsByEmail: vi.fn().mockResolvedValue([1]),
      findUserIdsByEmails: vi.fn().mockResolvedValue([1]),
      findUserIdsByEmailDomain: vi.fn().mockResolvedValue([1]),
      findUserEmailsByIds: vi.fn().mockResolvedValue(["john@example.com"]),
    };

    mockSecondaryEmailRepo = {
      findUserIdsByEmail: vi.fn().mockResolvedValue([]),
      findUserIdsByEmails: vi.fn().mockResolvedValue([]),
      findUserIdsByEmailDomain: vi.fn().mockResolvedValue([]),
    };

    mockScheduleRepo = {
      updateBlockedStatusByUserIds: vi.fn().mockResolvedValue({ count: 1 }),
    };

    mockWatchlistRepo = {
      hasBlockingEntryForEmailOrDomain: vi.fn().mockResolvedValue(false),
    };

    service = new ScheduleBlockingService({
      userRepo: mockUserRepo as UserRepository,
      secondaryEmailRepo: mockSecondaryEmailRepo as SecondaryEmailRepository,
      scheduleRepo: mockScheduleRepo as ScheduleRepository,
      watchlistRepo: mockWatchlistRepo as WatchlistRepository,
    });
  });

  describe("blockSchedulesByEmail", () => {
    it("should find users and block their schedules", async () => {
      const result = await service.blockSchedulesByEmail("john@example.com");

      expect(mockUserRepo.findUserIdsByEmail).toHaveBeenCalledWith("john@example.com");
      expect(mockSecondaryEmailRepo.findUserIdsByEmail).toHaveBeenCalledWith("john@example.com");
      expect(mockScheduleRepo.updateBlockedStatusByUserIds).toHaveBeenCalledWith([1], true);
      expect(result.count).toBe(1);
    });

    it("should normalize email to lowercase", async () => {
      await service.blockSchedulesByEmail("JOHN@EXAMPLE.COM");

      expect(mockUserRepo.findUserIdsByEmail).toHaveBeenCalledWith("john@example.com");
    });

    it("should dedupe user IDs from primary and secondary emails", async () => {
      (mockUserRepo.findUserIdsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue([1, 2]);
      (mockSecondaryEmailRepo.findUserIdsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue([2, 3]);

      await service.blockSchedulesByEmail("john@example.com");

      expect(mockScheduleRepo.updateBlockedStatusByUserIds).toHaveBeenCalledWith([1, 2, 3], true);
    });

    it("should return count 0 if no users found", async () => {
      (mockUserRepo.findUserIdsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockSecondaryEmailRepo.findUserIdsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.blockSchedulesByEmail("nonexistent@example.com");

      expect(mockScheduleRepo.updateBlockedStatusByUserIds).not.toHaveBeenCalled();
      expect(result.count).toBe(0);
    });
  });

  describe("blockSchedulesByDomain", () => {
    it("should find users by domain and block their schedules", async () => {
      const result = await service.blockSchedulesByDomain("example.com");

      expect(mockUserRepo.findUserIdsByEmailDomain).toHaveBeenCalledWith("example.com");
      expect(mockSecondaryEmailRepo.findUserIdsByEmailDomain).toHaveBeenCalledWith("example.com");
      expect(mockScheduleRepo.updateBlockedStatusByUserIds).toHaveBeenCalledWith([1], true);
      expect(result.count).toBe(1);
    });
  });

  describe("unblockSchedulesByEmail - Multiple Blocking Entries", () => {
    it("should NOT unblock if user is still blocked by domain entry", async () => {
      (mockWatchlistRepo.hasBlockingEntryForEmailOrDomain as ReturnType<typeof vi.fn>).mockResolvedValue(
        true
      );

      const result = await service.unblockSchedulesByEmail("john@example.com");

      expect(mockScheduleRepo.updateBlockedStatusByUserIds).not.toHaveBeenCalled();
      expect(result.count).toBe(0);
    });

    it("should unblock if no other blocking entries remain", async () => {
      (mockWatchlistRepo.hasBlockingEntryForEmailOrDomain as ReturnType<typeof vi.fn>).mockResolvedValue(
        false
      );

      const result = await service.unblockSchedulesByEmail("john@example.com");

      expect(mockScheduleRepo.updateBlockedStatusByUserIds).toHaveBeenCalledWith([1], false);
      expect(result.count).toBe(1);
    });

    it("should return count 0 if no users match the email", async () => {
      (mockUserRepo.findUserIdsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockSecondaryEmailRepo.findUserIdsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.unblockSchedulesByEmail("nonexistent@example.com");

      expect(mockScheduleRepo.updateBlockedStatusByUserIds).not.toHaveBeenCalled();
      expect(result.count).toBe(0);
    });
  });

  describe("unblockSchedulesByDomain - Multiple Blocking Entries", () => {
    it("should NOT unblock if user is still blocked by specific email entry", async () => {
      (mockWatchlistRepo.hasBlockingEntryForEmailOrDomain as ReturnType<typeof vi.fn>).mockResolvedValue(
        true
      );

      const result = await service.unblockSchedulesByDomain("example.com");

      expect(mockScheduleRepo.updateBlockedStatusByUserIds).not.toHaveBeenCalled();
      expect(result.count).toBe(0);
    });

    it("should unblock if no other blocking entries remain", async () => {
      (mockWatchlistRepo.hasBlockingEntryForEmailOrDomain as ReturnType<typeof vi.fn>).mockResolvedValue(
        false
      );

      const result = await service.unblockSchedulesByDomain("example.com");

      expect(mockScheduleRepo.updateBlockedStatusByUserIds).toHaveBeenCalledWith([1], false);
      expect(result.count).toBe(1);
    });

    it("should handle mixed scenarios - some users unblocked, others remain blocked", async () => {
      (mockUserRepo.findUserIdsByEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue([1, 2]);
      (mockUserRepo.findUserEmailsByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
        "john@example.com",
        "jane@example.com",
      ]);

      // john is still blocked by email, jane is not
      (mockWatchlistRepo.hasBlockingEntryForEmailOrDomain as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(true) // john
        .mockResolvedValueOnce(false); // jane

      const result = await service.unblockSchedulesByDomain("example.com");

      // Should only unblock jane (user ID 2)
      expect(mockScheduleRepo.updateBlockedStatusByUserIds).toHaveBeenCalledWith([2], false);
      expect(result.count).toBe(1);
    });
  });

  describe("handleWatchlistBlock", () => {
    it("should block by email for EMAIL type", async () => {
      await service.handleWatchlistBlock("EMAIL" as never, "john@example.com");

      expect(mockUserRepo.findUserIdsByEmail).toHaveBeenCalledWith("john@example.com");
      expect(mockScheduleRepo.updateBlockedStatusByUserIds).toHaveBeenCalledWith([1], true);
    });

    it("should block by domain for DOMAIN type", async () => {
      await service.handleWatchlistBlock("DOMAIN" as never, "example.com");

      expect(mockUserRepo.findUserIdsByEmailDomain).toHaveBeenCalledWith("example.com");
      expect(mockScheduleRepo.updateBlockedStatusByUserIds).toHaveBeenCalledWith([1], true);
    });
  });

  describe("handleWatchlistUnblock", () => {
    it("should unblock by email for EMAIL type", async () => {
      await service.handleWatchlistUnblock("EMAIL" as never, "john@example.com");

      expect(mockUserRepo.findUserIdsByEmail).toHaveBeenCalledWith("john@example.com");
    });

    it("should unblock by domain for DOMAIN type", async () => {
      await service.handleWatchlistUnblock("DOMAIN" as never, "example.com");

      expect(mockUserRepo.findUserIdsByEmailDomain).toHaveBeenCalledWith("example.com");
    });
  });
});
