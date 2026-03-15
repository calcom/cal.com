import { describe, test, expect, vi, beforeEach } from "vitest";

import { WatchlistType, WatchlistAction, WatchlistSource } from "@calcom/prisma/enums";

import type { IOrganizationWatchlistRepository } from "../interface/IWatchlistRepositories";
import { OrganizationBlockingService } from "./OrganizationBlockingService";

const mockOrgRepo: IOrganizationWatchlistRepository = {
  findBlockedEmail: vi.fn(),
  findBlockedDomain: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  findById: vi.fn(),
  listBlockedEntries: vi.fn(),
  listAllOrganizationEntries: vi.fn(),
  findBlockingEntriesForEmailsAndDomains: vi.fn(),
};

describe("OrganizationBlockingService", () => {
  let service: OrganizationBlockingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrganizationBlockingService({ orgRepo: mockOrgRepo });
  });

  describe("isBlocked", () => {
    const ORGANIZATION_ID = 123;

    test("should return blocked when email matches for organization", async () => {
      const mockEntry = {
        id: "123",
        type: WatchlistType.EMAIL,
        value: "blocked@example.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: false,
        organizationId: ORGANIZATION_ID,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockOrgRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([mockEntry]);

      const result = await service.isBlocked("blocked@example.com", ORGANIZATION_ID);

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.EMAIL);
      expect(result.watchlistEntry).toEqual(mockEntry);
      expect(mockOrgRepo.findBlockingEntriesForEmailsAndDomains).toHaveBeenCalledWith({
        emails: ["blocked@example.com"],
        domains: ["example.com"],
        organizationId: ORGANIZATION_ID,
      });
    });

    test("should return blocked when domain matches for organization", async () => {
      const mockEntry = {
        id: "456",
        type: WatchlistType.DOMAIN,
        value: "competitor.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: false,
        organizationId: ORGANIZATION_ID,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockOrgRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([mockEntry]);

      const result = await service.isBlocked("user@competitor.com", ORGANIZATION_ID);

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.DOMAIN);
      expect(result.watchlistEntry).toEqual(mockEntry);
    });

    test("should return not blocked when no matches for organization", async () => {
      vi.mocked(mockOrgRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([]);

      const result = await service.isBlocked("clean@example.com", ORGANIZATION_ID);

      expect(result.isBlocked).toBe(false);
      expect(result.reason).toBeUndefined();
      expect(result.watchlistEntry).toBeUndefined();
    });

    test("should normalize email before checking", async () => {
      vi.mocked(mockOrgRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([]);

      await service.isBlocked("USER@EXAMPLE.COM", ORGANIZATION_ID);

      expect(mockOrgRepo.findBlockingEntriesForEmailsAndDomains).toHaveBeenCalledWith({
        emails: ["user@example.com"],
        domains: ["example.com"],
        organizationId: ORGANIZATION_ID,
      });
    });

    test("should return email match over domain match", async () => {
      const emailEntry = {
        id: "123",
        type: WatchlistType.EMAIL,
        value: "specific@example.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: false,
        organizationId: ORGANIZATION_ID,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      const domainEntry = {
        id: "456",
        type: WatchlistType.DOMAIN,
        value: "example.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: false,
        organizationId: ORGANIZATION_ID,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockOrgRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([
        emailEntry,
        domainEntry,
      ]);

      const result = await service.isBlocked("specific@example.com", ORGANIZATION_ID);

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.EMAIL);
      expect(result.watchlistEntry).toEqual(emailEntry);
    });

    test("should only check specified organization", async () => {
      const ORG_A = 100;

      vi.mocked(mockOrgRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([]);

      await service.isBlocked("test@example.com", ORG_A);

      expect(mockOrgRepo.findBlockingEntriesForEmailsAndDomains).toHaveBeenCalledWith({
        emails: ["test@example.com"],
        domains: ["example.com"],
        organizationId: ORG_A,
      });
    });

    test("should NOT block subdomain when exact domain is blocked (no wildcard)", async () => {
      const exactDomainEntry = {
        id: "789",
        type: WatchlistType.DOMAIN,
        value: "cal.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: false,
        organizationId: ORGANIZATION_ID,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockOrgRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([exactDomainEntry]);

      const result = await service.isBlocked("user@app.cal.com", ORGANIZATION_ID);

      expect(result.isBlocked).toBe(false);
      expect(mockOrgRepo.findBlockingEntriesForEmailsAndDomains).toHaveBeenCalledWith({
        emails: ["user@app.cal.com"],
        domains: ["app.cal.com", "*.cal.com"],
        organizationId: ORGANIZATION_ID,
      });
    });

    test("should block subdomain when wildcard pattern is used", async () => {
      const wildcardEntry = {
        id: "789",
        type: WatchlistType.DOMAIN,
        value: "*.cal.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: false,
        organizationId: ORGANIZATION_ID,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockOrgRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([wildcardEntry]);

      const result = await service.isBlocked("user@app.cal.com", ORGANIZATION_ID);

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.DOMAIN);
      expect(result.watchlistEntry).toEqual(wildcardEntry);
    });

    test("should block deeply nested subdomain with wildcard pattern", async () => {
      const wildcardEntry = {
        id: "789",
        type: WatchlistType.DOMAIN,
        value: "*.app.cal.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: false,
        organizationId: ORGANIZATION_ID,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockOrgRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([wildcardEntry]);

      const result = await service.isBlocked("user@sub.app.cal.com", ORGANIZATION_ID);

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.DOMAIN);
      expect(result.watchlistEntry).toEqual(wildcardEntry);
      expect(mockOrgRepo.findBlockingEntriesForEmailsAndDomains).toHaveBeenCalledWith({
        emails: ["user@sub.app.cal.com"],
        domains: ["sub.app.cal.com", "*.app.cal.com"],
        organizationId: ORGANIZATION_ID,
      });
    });

    test("should NOT block exact domain with wildcard pattern", async () => {
      const wildcardEntry = {
        id: "789",
        type: WatchlistType.DOMAIN,
        value: "*.cal.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: false,
        organizationId: ORGANIZATION_ID,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockOrgRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([wildcardEntry]);

      const result = await service.isBlocked("user@cal.com", ORGANIZATION_ID);

      expect(result.isBlocked).toBe(false);
    });

    test("should prefer exact domain match over wildcard", async () => {
      const exactEntry = {
        id: "111",
        type: WatchlistType.DOMAIN,
        value: "app.cal.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: false,
        organizationId: ORGANIZATION_ID,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      const wildcardEntry = {
        id: "222",
        type: WatchlistType.DOMAIN,
        value: "*.cal.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: false,
        organizationId: ORGANIZATION_ID,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockOrgRepo.findBlockingEntriesForEmailsAndDomains).mockResolvedValue([
        exactEntry,
        wildcardEntry,
      ]);

      const result = await service.isBlocked("user@app.cal.com", ORGANIZATION_ID);

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.DOMAIN);
      expect(result.watchlistEntry).toEqual(exactEntry);
    });
  });
});
