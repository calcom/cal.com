import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IScheduleBlockingRepository } from "../repository/IScheduleBlockingRepository";
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
  let mockRepo: {
    blockSchedulesByEmail: ReturnType<typeof vi.fn>;
    blockSchedulesByEmails: ReturnType<typeof vi.fn>;
    blockSchedulesByDomain: ReturnType<typeof vi.fn>;
    unblockSchedulesByEmails: ReturnType<typeof vi.fn>;
    findUserEmailsForEmail: ReturnType<typeof vi.fn>;
    findUserEmailsForDomain: ReturnType<typeof vi.fn>;
    isUserStillBlocked: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepo = {
      blockSchedulesByEmail: vi.fn().mockResolvedValue({ count: 1 }),
      blockSchedulesByEmails: vi.fn().mockResolvedValue({ count: 1 }),
      blockSchedulesByDomain: vi.fn().mockResolvedValue({ count: 1 }),
      unblockSchedulesByEmails: vi.fn().mockResolvedValue({ count: 1 }),
      findUserEmailsForEmail: vi.fn().mockResolvedValue(["john@example.com"]),
      findUserEmailsForDomain: vi.fn().mockResolvedValue(["john@example.com"]),
      isUserStillBlocked: vi.fn().mockResolvedValue(false),
    };

    service = new ScheduleBlockingService(mockRepo as IScheduleBlockingRepository);
  });

  describe("blockSchedulesByEmail", () => {
    it("should delegate to repository", async () => {
      const result = await service.blockSchedulesByEmail("john@example.com");

      expect(mockRepo.blockSchedulesByEmail).toHaveBeenCalledWith("john@example.com");
      expect(result.count).toBe(1);
    });
  });

  describe("blockSchedulesByEmails", () => {
    it("should delegate to repository for batch operations", async () => {
      const result = await service.blockSchedulesByEmails(["john@example.com", "jane@example.com"]);

      expect(mockRepo.blockSchedulesByEmails).toHaveBeenCalledWith(["john@example.com", "jane@example.com"]);
      expect(result.count).toBe(1);
    });
  });

  describe("blockSchedulesByDomain", () => {
    it("should delegate to repository", async () => {
      const result = await service.blockSchedulesByDomain("example.com");

      expect(mockRepo.blockSchedulesByDomain).toHaveBeenCalledWith("example.com");
      expect(result.count).toBe(1);
    });
  });

  describe("unblockSchedulesByEmail - Multiple Blocking Entries", () => {
    it("should NOT unblock if user is still blocked by domain entry", async () => {
      // User john@example.com is blocked by BOTH email AND domain
      // When email block is removed, domain block should still keep them blocked
      mockRepo.isUserStillBlocked.mockResolvedValue(true);

      const result = await service.unblockSchedulesByEmail("john@example.com");

      // Should NOT update schedules because user is still blocked by domain
      expect(mockRepo.unblockSchedulesByEmails).not.toHaveBeenCalled();
      expect(result.count).toBe(0);
    });

    it("should unblock if no other blocking entries remain", async () => {
      // User john@example.com only has email block, no domain block
      mockRepo.isUserStillBlocked.mockResolvedValue(false);

      const result = await service.unblockSchedulesByEmail("john@example.com");

      expect(mockRepo.unblockSchedulesByEmails).toHaveBeenCalledWith(["john@example.com"]);
      expect(result.count).toBe(1);
    });

    it("should return count 0 if no users match the email", async () => {
      mockRepo.findUserEmailsForEmail.mockResolvedValue([]);

      const result = await service.unblockSchedulesByEmail("nonexistent@example.com");

      expect(mockRepo.unblockSchedulesByEmails).not.toHaveBeenCalled();
      expect(result.count).toBe(0);
    });
  });

  describe("unblockSchedulesByDomain - Multiple Blocking Entries", () => {
    it("should NOT unblock if user is still blocked by specific email entry", async () => {
      // User john@example.com is blocked by BOTH email AND domain
      // When domain block is removed, email block should still keep them blocked
      mockRepo.isUserStillBlocked.mockResolvedValue(true);

      const result = await service.unblockSchedulesByDomain("example.com");

      // Should NOT update schedules because user is still blocked by email
      expect(mockRepo.unblockSchedulesByEmails).not.toHaveBeenCalled();
      expect(result.count).toBe(0);
    });

    it("should unblock if no other blocking entries remain", async () => {
      // User john@example.com only has domain block, no email block
      mockRepo.isUserStillBlocked.mockResolvedValue(false);

      const result = await service.unblockSchedulesByDomain("example.com");

      expect(mockRepo.unblockSchedulesByEmails).toHaveBeenCalledWith(["john@example.com"]);
      expect(result.count).toBe(1);
    });

    it("should handle mixed scenarios - some users unblocked, others remain blocked", async () => {
      // Two users from same domain: john@example.com and jane@example.com
      // john is also blocked by specific email entry, jane is only blocked by domain
      mockRepo.findUserEmailsForDomain.mockResolvedValue(["john@example.com", "jane@example.com"]);

      // First call for john - still blocked by email
      // Second call for jane - not blocked by anything else
      mockRepo.isUserStillBlocked.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      const result = await service.unblockSchedulesByDomain("example.com");

      // Should only unblock jane, not john
      expect(mockRepo.unblockSchedulesByEmails).toHaveBeenCalledWith(["jane@example.com"]);
      expect(result.count).toBe(1);
    });
  });

  describe("handleWatchlistBlock", () => {
    it("should block by email for EMAIL type", async () => {
      await service.handleWatchlistBlock("EMAIL" as never, "john@example.com");

      expect(mockRepo.blockSchedulesByEmail).toHaveBeenCalledWith("john@example.com");
    });

    it("should block by domain for DOMAIN type", async () => {
      await service.handleWatchlistBlock("DOMAIN" as never, "example.com");

      expect(mockRepo.blockSchedulesByDomain).toHaveBeenCalledWith("example.com");
    });
  });

  describe("handleWatchlistUnblock", () => {
    it("should unblock by email for EMAIL type", async () => {
      await service.handleWatchlistUnblock("EMAIL" as never, "john@example.com");

      expect(mockRepo.findUserEmailsForEmail).toHaveBeenCalledWith("john@example.com");
    });

    it("should unblock by domain for DOMAIN type", async () => {
      await service.handleWatchlistUnblock("DOMAIN" as never, "example.com");

      expect(mockRepo.findUserEmailsForDomain).toHaveBeenCalledWith("example.com");
    });
  });
});
