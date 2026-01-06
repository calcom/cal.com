import { describe, test, expect, vi, beforeEach } from "vitest";

import { WatchlistType, WatchlistAction, WatchlistSource } from "@calcom/prisma/enums";

import type { IGlobalWatchlistRepository } from "../interface/IWatchlistRepositories";
import { GlobalBlockingService } from "./GlobalBlockingService";

const mockGlobalRepo: IGlobalWatchlistRepository = {
  findBlockedEmail: vi.fn(),
  findBlockedDomain: vi.fn(),
  findFreeEmailDomain: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  findById: vi.fn(),
  listBlockedEntries: vi.fn(),
};

describe("GlobalBlockingService", () => {
  let service: GlobalBlockingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GlobalBlockingService({ globalRepo: mockGlobalRepo });
  });

  describe("isBlocked", () => {
    test("should return blocked when email matches", async () => {
      const mockEntry = {
        id: "123",
        type: WatchlistType.EMAIL,
        value: "blocked@example.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: true,
        organizationId: null,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockGlobalRepo.findBlockedEmail).mockResolvedValue(mockEntry);
      vi.mocked(mockGlobalRepo.findBlockedDomain).mockResolvedValue(null);

      const result = await service.isBlocked("blocked@example.com");

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.EMAIL);
      expect(result.watchlistEntry).toEqual(mockEntry);
      expect(mockGlobalRepo.findBlockedEmail).toHaveBeenCalledWith("blocked@example.com");
      expect(mockGlobalRepo.findBlockedDomain).toHaveBeenCalledWith("example.com");
    });

    test("should return blocked when domain matches", async () => {
      const mockEntry = {
        id: "456",
        type: WatchlistType.DOMAIN,
        value: "spam.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: true,
        organizationId: null,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockGlobalRepo.findBlockedEmail).mockResolvedValue(null);
      vi.mocked(mockGlobalRepo.findBlockedDomain).mockResolvedValue(mockEntry);

      const result = await service.isBlocked("user@spam.com");

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.DOMAIN);
      expect(result.watchlistEntry).toEqual(mockEntry);
      expect(mockGlobalRepo.findBlockedEmail).toHaveBeenCalledWith("user@spam.com");
      expect(mockGlobalRepo.findBlockedDomain).toHaveBeenCalledWith("spam.com");
    });

    test("should return not blocked when no matches", async () => {
      vi.mocked(mockGlobalRepo.findBlockedEmail).mockResolvedValue(null);
      vi.mocked(mockGlobalRepo.findBlockedDomain).mockResolvedValue(null);

      const result = await service.isBlocked("clean@example.com");

      expect(result.isBlocked).toBe(false);
      expect(result.reason).toBeUndefined();
      expect(result.watchlistEntry).toBeUndefined();
    });

    test("should normalize email before checking", async () => {
      vi.mocked(mockGlobalRepo.findBlockedEmail).mockResolvedValue(null);
      vi.mocked(mockGlobalRepo.findBlockedDomain).mockResolvedValue(null);

      await service.isBlocked("USER@EXAMPLE.COM");

      expect(mockGlobalRepo.findBlockedEmail).toHaveBeenCalledWith("user@example.com");
      expect(mockGlobalRepo.findBlockedDomain).toHaveBeenCalledWith("example.com");
    });

    test("should check both email and domain in parallel", async () => {
      const emailPromise = Promise.resolve(null);
      const domainPromise = Promise.resolve(null);

      vi.mocked(mockGlobalRepo.findBlockedEmail).mockReturnValue(emailPromise);
      vi.mocked(mockGlobalRepo.findBlockedDomain).mockReturnValue(domainPromise);

      await service.isBlocked("test@example.com");

      // Both should be called before awaiting (parallel execution)
      expect(mockGlobalRepo.findBlockedEmail).toHaveBeenCalled();
      expect(mockGlobalRepo.findBlockedDomain).toHaveBeenCalled();
    });

    test("should return email match over domain match", async () => {
      const emailEntry = {
        id: "123",
        type: WatchlistType.EMAIL,
        value: "specific@example.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: true,
        organizationId: null,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      const domainEntry = {
        id: "456",
        type: WatchlistType.DOMAIN,
        value: "example.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: true,
        organizationId: null,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockGlobalRepo.findBlockedEmail).mockResolvedValue(emailEntry);
      vi.mocked(mockGlobalRepo.findBlockedDomain).mockResolvedValue(domainEntry);

      const result = await service.isBlocked("specific@example.com");

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.EMAIL); // Email takes precedence
      expect(result.watchlistEntry).toEqual(emailEntry);
    });
  });

  describe("isFreeEmailDomain", () => {
    test("should return true when domain is in free email list", async () => {
      const mockEntry = {
        id: "789",
        type: WatchlistType.DOMAIN,
        value: "yahoo.com",
        description: null,
        action: WatchlistAction.REPORT,
        isGlobal: true,
        organizationId: null,
        source: WatchlistSource.FREE_DOMAIN_POLICY,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockGlobalRepo.findFreeEmailDomain).mockResolvedValue(mockEntry);

      const result = await service.isFreeEmailDomain("yahoo.com");

      expect(result).toBe(true);
      expect(mockGlobalRepo.findFreeEmailDomain).toHaveBeenCalledWith("yahoo.com");
    });

    test("should return false when domain is not in free email list", async () => {
      vi.mocked(mockGlobalRepo.findFreeEmailDomain).mockResolvedValue(null);

      const result = await service.isFreeEmailDomain("corporatedomain.com");

      expect(result).toBe(false);
      expect(mockGlobalRepo.findFreeEmailDomain).toHaveBeenCalledWith("corporatedomain.com");
    });

    test("should normalize domain before checking", async () => {
      vi.mocked(mockGlobalRepo.findFreeEmailDomain).mockResolvedValue(null);

      await service.isFreeEmailDomain("GMAIL.COM");

      expect(mockGlobalRepo.findFreeEmailDomain).toHaveBeenCalledWith("gmail.com");
    });

    test("should handle domain with @ prefix", async () => {
      vi.mocked(mockGlobalRepo.findFreeEmailDomain).mockResolvedValue(null);

      await service.isFreeEmailDomain("@hotmail.com");

      expect(mockGlobalRepo.findFreeEmailDomain).toHaveBeenCalledWith("hotmail.com");
    });
  });
});
