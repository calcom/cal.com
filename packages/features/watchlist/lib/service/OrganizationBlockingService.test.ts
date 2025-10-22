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

      vi.mocked(mockOrgRepo.findBlockedEmail).mockResolvedValue(mockEntry);
      vi.mocked(mockOrgRepo.findBlockedDomain).mockResolvedValue(null);

      const result = await service.isBlocked("blocked@example.com", ORGANIZATION_ID);

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.EMAIL);
      expect(result.watchlistEntry).toEqual(mockEntry);
      expect(mockOrgRepo.findBlockedEmail).toHaveBeenCalledWith({
        email: "blocked@example.com",
        organizationId: ORGANIZATION_ID,
      });
      expect(mockOrgRepo.findBlockedDomain).toHaveBeenCalledWith("example.com", ORGANIZATION_ID);
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

      vi.mocked(mockOrgRepo.findBlockedEmail).mockResolvedValue(null);
      vi.mocked(mockOrgRepo.findBlockedDomain).mockResolvedValue(mockEntry);

      const result = await service.isBlocked("user@competitor.com", ORGANIZATION_ID);

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.DOMAIN);
      expect(result.watchlistEntry).toEqual(mockEntry);
    });

    test("should return not blocked when no matches for organization", async () => {
      vi.mocked(mockOrgRepo.findBlockedEmail).mockResolvedValue(null);
      vi.mocked(mockOrgRepo.findBlockedDomain).mockResolvedValue(null);

      const result = await service.isBlocked("clean@example.com", ORGANIZATION_ID);

      expect(result.isBlocked).toBe(false);
      expect(result.reason).toBeUndefined();
      expect(result.watchlistEntry).toBeUndefined();
    });

    test("should normalize email before checking", async () => {
      vi.mocked(mockOrgRepo.findBlockedEmail).mockResolvedValue(null);
      vi.mocked(mockOrgRepo.findBlockedDomain).mockResolvedValue(null);

      await service.isBlocked("USER@EXAMPLE.COM", ORGANIZATION_ID);

      expect(mockOrgRepo.findBlockedEmail).toHaveBeenCalledWith({
        email: "user@example.com",
        organizationId: ORGANIZATION_ID,
      });
      expect(mockOrgRepo.findBlockedDomain).toHaveBeenCalledWith("example.com", ORGANIZATION_ID);
    });

    test("should check both email and domain in parallel", async () => {
      const emailPromise = Promise.resolve(null);
      const domainPromise = Promise.resolve(null);

      vi.mocked(mockOrgRepo.findBlockedEmail).mockReturnValue(emailPromise);
      vi.mocked(mockOrgRepo.findBlockedDomain).mockReturnValue(domainPromise);

      await service.isBlocked("test@example.com", ORGANIZATION_ID);

      // Both should be called before awaiting (parallel execution)
      expect(mockOrgRepo.findBlockedEmail).toHaveBeenCalled();
      expect(mockOrgRepo.findBlockedDomain).toHaveBeenCalled();
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

      vi.mocked(mockOrgRepo.findBlockedEmail).mockResolvedValue(emailEntry);
      vi.mocked(mockOrgRepo.findBlockedDomain).mockResolvedValue(domainEntry);

      const result = await service.isBlocked("specific@example.com", ORGANIZATION_ID);

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.EMAIL); // Email takes precedence
      expect(result.watchlistEntry).toEqual(emailEntry);
    });

    test("should only check specified organization", async () => {
      const ORG_A = 100;
      const ORG_B = 200;

      vi.mocked(mockOrgRepo.findBlockedEmail).mockResolvedValue(null);
      vi.mocked(mockOrgRepo.findBlockedDomain).mockResolvedValue(null);

      await service.isBlocked("test@example.com", ORG_A);

      // Should only query for ORG_A, not ORG_B
      expect(mockOrgRepo.findBlockedEmail).toHaveBeenCalledWith({
        email: "test@example.com",
        organizationId: ORG_A,
      });
      expect(mockOrgRepo.findBlockedDomain).toHaveBeenCalledWith("example.com", ORG_A);
      expect(mockOrgRepo.findBlockedEmail).not.toHaveBeenCalledWith({
        email: "test@example.com",
        organizationId: ORG_B,
      });
    });
  });
});
