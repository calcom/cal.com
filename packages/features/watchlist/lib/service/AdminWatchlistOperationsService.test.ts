import { WatchlistAction, WatchlistSource, WatchlistType } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AdminWatchlistOperationsService } from "./AdminWatchlistOperationsService";

vi.mock("@calcom/features/auth/lib/verifyEmail", () => ({
  sendEmailVerification: vi.fn().mockResolvedValue(undefined),
}));

import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";

function createMockWatchlistRepo() {
  return {
    findEntryWithAuditAndReports: vi.fn(),
    deleteEntry: vi.fn().mockResolvedValue(undefined),
    findEntriesByIds: vi.fn().mockResolvedValue([]),
    bulkDeleteEntries: vi.fn().mockResolvedValue({ deleted: 0 }),
    createEntry: vi.fn(),
    createEntryIfNotExists: vi.fn(),
    checkExists: vi.fn(),
    findAllEntriesWithLatestAudit: vi.fn(),
    createEntryFromReport: vi.fn(),
    findOrgAndGlobalEntries: vi.fn(),
  };
}

function createMockBookingReportRepo() {
  return {
    findPendingSystemReportsByEmail: vi.fn(),
    findPendingSystemReportsByDomain: vi.fn(),
    bulkLinkGlobalWatchlistWithSystemStatus: vi.fn(),
    dismissSystemReportsByEmail: vi.fn(),
  };
}

function createMockUserRepo() {
  return {
    unlockByEmail: vi.fn().mockResolvedValue(null),
  };
}

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-1",
    type: WatchlistType.EMAIL,
    value: "test@example.com",
    action: WatchlistAction.BLOCK,
    description: null,
    organizationId: null,
    isGlobal: true,
    source: WatchlistSource.SIGNUP,
    lastUpdatedAt: new Date(),
    ...overrides,
  };
}

describe("AdminWatchlistOperationsService", () => {
  let service: AdminWatchlistOperationsService;
  let mockWatchlistRepo: ReturnType<typeof createMockWatchlistRepo>;
  let mockBookingReportRepo: ReturnType<typeof createMockBookingReportRepo>;
  let mockUserRepo: ReturnType<typeof createMockUserRepo>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWatchlistRepo = createMockWatchlistRepo();
    mockBookingReportRepo = createMockBookingReportRepo();
    mockUserRepo = createMockUserRepo();

    service = new AdminWatchlistOperationsService({
      watchlistRepo: mockWatchlistRepo as never,
      bookingReportRepo: mockBookingReportRepo as never,
      userRepo: mockUserRepo as never,
    });
  });

  describe("deleteWatchlistEntry - auto-unlock", () => {
    test("should unlock user and send verification email when deleting SIGNUP email entry", async () => {
      const entry = makeEntry({ source: WatchlistSource.SIGNUP, type: WatchlistType.EMAIL });
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({ entry, auditHistory: [] });
      mockUserRepo.unlockByEmail.mockResolvedValue({ email: "test@example.com", username: "testuser" });

      await service.deleteWatchlistEntry({ entryId: "entry-1", userId: 1 });

      expect(mockWatchlistRepo.deleteEntry).toHaveBeenCalledWith("entry-1", 1);
      expect(mockUserRepo.unlockByEmail).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(sendEmailVerification).toHaveBeenCalledWith({
        email: "test@example.com",
        username: "testuser",
      });
    });

    test("should not unlock user when deleting MANUAL source entry", async () => {
      const entry = makeEntry({ source: WatchlistSource.MANUAL, type: WatchlistType.EMAIL });
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({ entry, auditHistory: [] });

      await service.deleteWatchlistEntry({ entryId: "entry-1", userId: 1 });

      expect(mockWatchlistRepo.deleteEntry).toHaveBeenCalledWith("entry-1", 1);
      expect(mockUserRepo.unlockByEmail).not.toHaveBeenCalled();
      expect(sendEmailVerification).not.toHaveBeenCalled();
    });

    test("should not unlock user when deleting SIGNUP domain entry", async () => {
      const entry = makeEntry({
        source: WatchlistSource.SIGNUP,
        type: WatchlistType.DOMAIN,
        value: "example.com",
      });
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({ entry, auditHistory: [] });

      await service.deleteWatchlistEntry({ entryId: "entry-1", userId: 1 });

      expect(mockUserRepo.unlockByEmail).not.toHaveBeenCalled();
    });

    test("should not send verification email when user is not locked", async () => {
      const entry = makeEntry({ source: WatchlistSource.SIGNUP, type: WatchlistType.EMAIL });
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({ entry, auditHistory: [] });
      mockUserRepo.unlockByEmail.mockResolvedValue(null);

      await service.deleteWatchlistEntry({ entryId: "entry-1", userId: 1 });

      expect(mockUserRepo.unlockByEmail).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(sendEmailVerification).not.toHaveBeenCalled();
    });

    test("should not throw if unlock fails", async () => {
      const entry = makeEntry({ source: WatchlistSource.SIGNUP, type: WatchlistType.EMAIL });
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({ entry, auditHistory: [] });
      mockUserRepo.unlockByEmail.mockRejectedValue(new Error("db error"));

      const result = await service.deleteWatchlistEntry({ entryId: "entry-1", userId: 1 });

      expect(result.success).toBe(true);
    });
  });

  describe("bulkDeleteWatchlistEntries - auto-unlock", () => {
    test("should unlock users for SIGNUP email entries in bulk delete", async () => {
      const entries = [
        {
          id: "e1",
          isGlobal: true,
          organizationId: null,
          source: WatchlistSource.SIGNUP,
          type: WatchlistType.EMAIL,
          value: "user1@example.com",
        },
        {
          id: "e2",
          isGlobal: true,
          organizationId: null,
          source: WatchlistSource.MANUAL,
          type: WatchlistType.EMAIL,
          value: "user2@example.com",
        },
      ];
      mockWatchlistRepo.findEntriesByIds.mockResolvedValue(entries);
      mockWatchlistRepo.bulkDeleteEntries.mockResolvedValue({ deleted: 2 });
      mockUserRepo.unlockByEmail.mockResolvedValue({ email: "user1@example.com", username: "user1" });

      await service.bulkDeleteWatchlistEntries({ entryIds: ["e1", "e2"], userId: 1 });

      expect(mockUserRepo.unlockByEmail).toHaveBeenCalledTimes(1);
      expect(mockUserRepo.unlockByEmail).toHaveBeenCalledWith({ email: "user1@example.com" });
      expect(sendEmailVerification).toHaveBeenCalledWith({
        email: "user1@example.com",
        username: "user1",
      });
    });

    test("should not unlock users for non-SIGNUP entries in bulk delete", async () => {
      const entries = [
        {
          id: "e1",
          isGlobal: true,
          organizationId: null,
          source: WatchlistSource.MANUAL,
          type: WatchlistType.EMAIL,
          value: "user@example.com",
        },
      ];
      mockWatchlistRepo.findEntriesByIds.mockResolvedValue(entries);
      mockWatchlistRepo.bulkDeleteEntries.mockResolvedValue({ deleted: 1 });

      await service.bulkDeleteWatchlistEntries({ entryIds: ["e1"], userId: 1 });

      expect(mockUserRepo.unlockByEmail).not.toHaveBeenCalled();
    });

    test("should handle multiple SIGNUP entries in bulk delete", async () => {
      const entries = [
        {
          id: "e1",
          isGlobal: true,
          organizationId: null,
          source: WatchlistSource.SIGNUP,
          type: WatchlistType.EMAIL,
          value: "user1@example.com",
        },
        {
          id: "e2",
          isGlobal: true,
          organizationId: null,
          source: WatchlistSource.SIGNUP,
          type: WatchlistType.EMAIL,
          value: "user2@example.com",
        },
      ];
      mockWatchlistRepo.findEntriesByIds.mockResolvedValue(entries);
      mockWatchlistRepo.bulkDeleteEntries.mockResolvedValue({ deleted: 2 });
      mockUserRepo.unlockByEmail
        .mockResolvedValueOnce({ email: "user1@example.com", username: "user1" })
        .mockResolvedValueOnce({ email: "user2@example.com", username: "user2" });

      await service.bulkDeleteWatchlistEntries({ entryIds: ["e1", "e2"], userId: 1 });

      expect(mockUserRepo.unlockByEmail).toHaveBeenCalledTimes(2);
      expect(sendEmailVerification).toHaveBeenCalledTimes(2);
    });
  });
});
