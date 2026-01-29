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
  findBlockingEntriesForEmailsAndDomains: vi.fn(),
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

      vi.mocked(mockGlobalRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([mockEntry]);

      const result = await service.isBlocked("blocked@example.com");

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.EMAIL);
      expect(result.watchlistEntry).toEqual(mockEntry);
      expect(mockGlobalRepo.findBlockingEntriesForEmailsAndDomains).toHaveBeenCalledWith({
        emails: ["blocked@example.com"],
        domains: ["example.com"],
      });
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

      vi.mocked(mockGlobalRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([mockEntry]);

      const result = await service.isBlocked("user@spam.com");

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.DOMAIN);
      expect(result.watchlistEntry).toEqual(mockEntry);
      expect(mockGlobalRepo.findBlockingEntriesForEmailsAndDomains).toHaveBeenCalledWith({
        emails: ["user@spam.com"],
        domains: ["spam.com"],
      });
    });

    test("should return not blocked when no matches", async () => {
      vi.mocked(mockGlobalRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([]);

      const result = await service.isBlocked("clean@example.com");

      expect(result.isBlocked).toBe(false);
      expect(result.reason).toBeUndefined();
      expect(result.watchlistEntry).toBeUndefined();
    });

    test("should normalize email before checking", async () => {
      vi.mocked(mockGlobalRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([]);

      await service.isBlocked("USER@EXAMPLE.COM");

      expect(mockGlobalRepo.findBlockingEntriesForEmailsAndDomains).toHaveBeenCalledWith({
        emails: ["user@example.com"],
        domains: ["example.com"],
      });
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

      vi.mocked(mockGlobalRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([
        emailEntry,
        domainEntry,
      ]);

      const result = await service.isBlocked("specific@example.com");

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.EMAIL);
      expect(result.watchlistEntry).toEqual(emailEntry);
    });

    test("should block subdomain when parent domain is blocked (wildcard matching)", async () => {
      const parentDomainEntry = {
        id: "789",
        type: WatchlistType.DOMAIN,
        value: "cal.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: true,
        organizationId: null,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockGlobalRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([parentDomainEntry]);

      const result = await service.isBlocked("user@app.cal.com");

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.DOMAIN);
      expect(result.watchlistEntry).toEqual(parentDomainEntry);
      expect(mockGlobalRepo.findBlockingEntriesForEmailsAndDomains).toHaveBeenCalledWith({
        emails: ["user@app.cal.com"],
        domains: ["app.cal.com", "cal.com"],
      });
    });

    test("should block deeply nested subdomain when parent domain is blocked", async () => {
      const parentDomainEntry = {
        id: "789",
        type: WatchlistType.DOMAIN,
        value: "cal.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: true,
        organizationId: null,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockGlobalRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([parentDomainEntry]);

      const result = await service.isBlocked("user@sub.app.cal.com");

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.DOMAIN);
      expect(result.watchlistEntry).toEqual(parentDomainEntry);
      expect(mockGlobalRepo.findBlockingEntriesForEmailsAndDomains).toHaveBeenCalledWith({
        emails: ["user@sub.app.cal.com"],
        domains: ["sub.app.cal.com", "app.cal.com", "cal.com"],
      });
    });

    test("should prefer more specific subdomain match over parent domain", async () => {
      const subdomainEntry = {
        id: "111",
        type: WatchlistType.DOMAIN,
        value: "app.cal.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: true,
        organizationId: null,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      const parentDomainEntry = {
        id: "222",
        type: WatchlistType.DOMAIN,
        value: "cal.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: true,
        organizationId: null,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockGlobalRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([
        subdomainEntry,
        parentDomainEntry,
      ]);

      const result = await service.isBlocked("user@app.cal.com");

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.DOMAIN);
      expect(result.watchlistEntry).toEqual(subdomainEntry);
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
