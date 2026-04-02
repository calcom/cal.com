import { WatchlistAction, WatchlistSource, WatchlistType } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type {
  IGlobalWatchlistRepository,
  IOrganizationWatchlistRepository,
} from "../interface/IWatchlistRepositories";
import { WatchlistService } from "./WatchlistService";

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

const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

describe("WatchlistService", () => {
  let service: WatchlistService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WatchlistService({
      globalRepo: mockGlobalRepo,
      orgRepo: mockOrgRepo,
      logger: mockLogger as never,
    });
  });

  describe("createEntry", () => {
    test("should create global entry with normalized email", async () => {
      const mockEntry = {
        id: "123",
        type: WatchlistType.EMAIL,
        value: "test@example.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: true,
        organizationId: null,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockGlobalRepo.createEntry).mockResolvedValue(mockEntry);

      const result = await service.createEntry({
        type: WatchlistType.EMAIL,
        value: "TEST@EXAMPLE.COM", // Not normalized
        action: WatchlistAction.BLOCK,
        isGlobal: true,
      });

      expect(mockGlobalRepo.createEntry).toHaveBeenCalledWith({
        type: WatchlistType.EMAIL,
        value: "test@example.com", // Normalized by service
        description: undefined,
        action: WatchlistAction.BLOCK,
        source: undefined,
      });
      expect(result).toEqual(mockEntry);
    });

    test("should create global entry with normalized domain", async () => {
      const mockEntry = {
        id: "456",
        type: WatchlistType.DOMAIN,
        value: "spam.com",
        description: "Spam domain",
        action: WatchlistAction.BLOCK,
        isGlobal: true,
        organizationId: null,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockGlobalRepo.createEntry).mockResolvedValue(mockEntry);

      const result = await service.createEntry({
        type: WatchlistType.DOMAIN,
        value: "SPAM.COM", // Not normalized, no @ prefix
        description: "Spam domain",
        action: WatchlistAction.BLOCK,
        isGlobal: true,
      });

      expect(mockGlobalRepo.createEntry).toHaveBeenCalledWith({
        type: WatchlistType.DOMAIN,
        value: "spam.com", // Normalized without @ prefix
        description: "Spam domain",
        action: WatchlistAction.BLOCK,
        source: undefined,
      });
      expect(result).toEqual(mockEntry);
    });

    test("should create organization entry", async () => {
      const mockEntry = {
        id: "789",
        type: WatchlistType.EMAIL,
        value: "competitor@example.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: false,
        organizationId: 123,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockOrgRepo.createEntry).mockResolvedValue(mockEntry);

      const result = await service.createEntry({
        type: WatchlistType.EMAIL,
        value: "COMPETITOR@EXAMPLE.COM",
        action: WatchlistAction.BLOCK,
        isGlobal: false,
        organizationId: 123,
      });

      expect(mockOrgRepo.createEntry).toHaveBeenCalledWith(123, {
        type: WatchlistType.EMAIL,
        value: "competitor@example.com",
        description: undefined,
        action: WatchlistAction.BLOCK,
        source: undefined,
      });
      expect(result).toEqual(mockEntry);
    });

    test("should throw when organizationId missing for non-global entry", async () => {
      await expect(
        service.createEntry({
          type: WatchlistType.EMAIL,
          value: "test@example.com",
          action: WatchlistAction.BLOCK,
          isGlobal: false,
          // organizationId missing!
        })
      ).rejects.toThrow("organizationId is required for organization-scoped entries");

      expect(mockLogger.error).toHaveBeenCalledWith(
        "organizationId required for non-global entry",
        expect.objectContaining({
          type: WatchlistType.EMAIL,
          value: "test@example.com",
        })
      );
    });

    test("should create entry with FREE_DOMAIN_POLICY source", async () => {
      const mockEntry = {
        id: "free-1",
        type: WatchlistType.DOMAIN,
        value: "gmail.com",
        description: null,
        action: WatchlistAction.REPORT,
        isGlobal: true,
        organizationId: null,
        source: WatchlistSource.FREE_DOMAIN_POLICY,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockGlobalRepo.createEntry).mockResolvedValue(mockEntry);

      const result = await service.createEntry({
        type: WatchlistType.DOMAIN,
        value: "gmail.com",
        action: WatchlistAction.REPORT,
        isGlobal: true,
        source: WatchlistSource.FREE_DOMAIN_POLICY,
      });

      expect(mockGlobalRepo.createEntry).toHaveBeenCalledWith({
        type: WatchlistType.DOMAIN,
        value: "gmail.com",
        description: undefined,
        action: WatchlistAction.REPORT,
        source: WatchlistSource.FREE_DOMAIN_POLICY,
      });
      expect(result).toEqual(mockEntry);
    });
  });

  describe("updateEntry", () => {
    test("should update entry with normalized email", async () => {
      const mockEntry = {
        id: "123",
        type: WatchlistType.EMAIL,
        value: "updated@example.com",
        description: "Updated description",
        action: WatchlistAction.ALERT,
        isGlobal: true,
        organizationId: null,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockGlobalRepo.updateEntry).mockResolvedValue(mockEntry);

      const result = await service.updateEntry("123", {
        type: WatchlistType.EMAIL,
        value: "UPDATED@EXAMPLE.COM", // Not normalized
        description: "Updated description",
        action: WatchlistAction.ALERT,
      });

      expect(mockGlobalRepo.updateEntry).toHaveBeenCalledWith("123", {
        type: WatchlistType.EMAIL,
        value: "updated@example.com", // Normalized
        description: "Updated description",
        action: WatchlistAction.ALERT,
        source: undefined,
      });
      expect(result).toEqual(mockEntry);
    });

    test("should update entry without value change", async () => {
      const mockEntry = {
        id: "123",
        type: WatchlistType.EMAIL,
        value: "test@example.com",
        description: "New description",
        action: WatchlistAction.BLOCK,
        isGlobal: true,
        organizationId: null,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockGlobalRepo.updateEntry).mockResolvedValue(mockEntry);

      const result = await service.updateEntry("123", {
        type: WatchlistType.EMAIL, // Required for normalization
        description: "New description",
      });

      expect(mockGlobalRepo.updateEntry).toHaveBeenCalledWith("123", {
        type: WatchlistType.EMAIL,
        description: "New description",
        action: undefined,
        source: undefined,
      });
      expect(result).toEqual(mockEntry);
    });
  });

  describe("deleteEntry", () => {
    test("should delete entry by id", async () => {
      vi.mocked(mockGlobalRepo.deleteEntry).mockResolvedValue();

      await service.deleteEntry("123");

      expect(mockGlobalRepo.deleteEntry).toHaveBeenCalledWith("123");
    });
  });

  describe("getEntry", () => {
    test("should get entry by id", async () => {
      const mockEntry = {
        id: "123",
        type: WatchlistType.EMAIL,
        value: "test@example.com",
        description: null,
        action: WatchlistAction.BLOCK,
        isGlobal: true,
        organizationId: null,
        source: WatchlistSource.MANUAL,
        lastUpdatedAt: new Date(),
      };

      vi.mocked(mockGlobalRepo.findById).mockResolvedValue(mockEntry);

      const result = await service.getEntry("123");

      expect(mockGlobalRepo.findById).toHaveBeenCalledWith("123");
      expect(result).toEqual(mockEntry);
    });

    test("should return null when entry not found", async () => {
      vi.mocked(mockGlobalRepo.findById).mockResolvedValue(null);

      const result = await service.getEntry("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("listAllSystemEntries", () => {
    test("should return combined global and org entries", async () => {
      const globalEntries = [
        {
          id: "1",
          type: WatchlistType.EMAIL,
          value: "global@example.com",
          description: null,
          action: WatchlistAction.BLOCK,
          isGlobal: true,
          organizationId: null,
          source: WatchlistSource.MANUAL,
          lastUpdatedAt: new Date(),
        },
      ];

      const orgEntries = [
        {
          id: "2",
          type: WatchlistType.DOMAIN,
          value: "competitor.com",
          description: null,
          action: WatchlistAction.BLOCK,
          isGlobal: false,
          organizationId: 123,
          source: WatchlistSource.MANUAL,
          lastUpdatedAt: new Date(),
        },
      ];

      vi.mocked(mockGlobalRepo.listBlockedEntries).mockResolvedValue(globalEntries);
      vi.mocked(mockOrgRepo.listAllOrganizationEntries).mockResolvedValue(orgEntries);

      const result = await service.listAllSystemEntries();

      expect(mockGlobalRepo.listBlockedEntries).toHaveBeenCalled();
      expect(mockOrgRepo.listAllOrganizationEntries).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result).toEqual([...globalEntries, ...orgEntries]);
    });

    test("should return empty array when no entries exist", async () => {
      vi.mocked(mockGlobalRepo.listBlockedEntries).mockResolvedValue([]);
      vi.mocked(mockOrgRepo.listAllOrganizationEntries).mockResolvedValue([]);

      const result = await service.listAllSystemEntries();

      expect(result).toEqual([]);
    });

    test("should fetch global and org entries in parallel", async () => {
      const globalPromise = Promise.resolve([]);
      const orgPromise = Promise.resolve([]);

      vi.mocked(mockGlobalRepo.listBlockedEntries).mockReturnValue(globalPromise);
      vi.mocked(mockOrgRepo.listAllOrganizationEntries).mockReturnValue(orgPromise);

      await service.listAllSystemEntries();

      // Verify both repository methods are invoked (implementation uses Promise.all)
      expect(mockGlobalRepo.listBlockedEntries).toHaveBeenCalled();
      expect(mockOrgRepo.listAllOrganizationEntries).toHaveBeenCalled();
    });
  });
});
