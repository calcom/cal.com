import { WatchlistAction, WatchlistSource, WatchlistType } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WatchlistErrorCode } from "../errors/WatchlistErrors";
import { OrganizationWatchlistQueryService } from "./OrganizationWatchlistQueryService";

function createMockDeps() {
  return {
    watchlistRepo: {
      findOrgAndGlobalEntries: vi.fn(),
      findEntryWithAuditAndReports: vi.fn(),
    },
    userRepo: {
      findUsersByIds: vi.fn().mockResolvedValue([]),
    },
    permissionCheckService: {
      checkPermission: vi.fn().mockResolvedValue(true),
    },
  };
}

function makeGlobalEntry(organizationIds: Array<number | null>) {
  return {
    id: "entry-1",
    type: WatchlistType.EMAIL,
    value: "blocked@example.com",
    action: WatchlistAction.BLOCK,
    description: null,
    organizationId: null,
    isGlobal: true,
    source: WatchlistSource.MANUAL,
    lastUpdatedAt: new Date(),
    bookingReports: organizationIds.map((organizationId, index) => ({
      organizationId,
      booking: {
        uid: `booking-${index}`,
        title: null,
      },
    })),
  };
}

describe("OrganizationWatchlistQueryService", () => {
  const organizationId = 11;
  const userId = 7;

  let deps: ReturnType<typeof createMockDeps>;
  let service: OrganizationWatchlistQueryService;

  beforeEach(() => {
    deps = createMockDeps();
    service = new OrganizationWatchlistQueryService({
      watchlistRepo: deps.watchlistRepo as never,
      userRepo: deps.userRepo as never,
      permissionCheckService: deps.permissionCheckService as never,
    });
  });

  describe("getWatchlistEntryDetails", () => {
    it("rejects unrelated global entries", async () => {
      deps.watchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: makeGlobalEntry([999]),
        auditHistory: [],
      });

      await expect(
        service.getWatchlistEntryDetails({
          organizationId,
          userId,
          entryId: "entry-1",
        })
      ).rejects.toMatchObject({
        code: WatchlistErrorCode.PERMISSION_DENIED,
      });
    });

    it("allows global entries linked to the requesting organization", async () => {
      deps.watchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: makeGlobalEntry([organizationId, 999]),
        auditHistory: [],
      });

      const result = await service.getWatchlistEntryDetails({
        organizationId,
        userId,
        entryId: "entry-1",
      });

      expect(result.isReadOnly).toBe(true);
      expect(result.entry.id).toBe("entry-1");
    });

    it("allows organization-owned entries", async () => {
      deps.watchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: {
          id: "org-entry-1",
          type: WatchlistType.DOMAIN,
          value: "example.com",
          action: WatchlistAction.BLOCK,
          description: null,
          organizationId,
          isGlobal: false,
          source: WatchlistSource.MANUAL,
          lastUpdatedAt: new Date(),
          bookingReports: [],
        },
        auditHistory: [],
      });

      const result = await service.getWatchlistEntryDetails({
        organizationId,
        userId,
        entryId: "org-entry-1",
      });

      expect(result.isReadOnly).toBe(false);
      expect(result.entry.organizationId).toBe(organizationId);
    });
  });
});
