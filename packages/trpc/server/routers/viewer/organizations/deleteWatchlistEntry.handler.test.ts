import { describe, it, expect, vi, beforeEach } from "vitest";

import { WatchlistErrors } from "@calcom/features/watchlist/lib/errors/WatchlistErrors";
import { WatchlistType, WatchlistAction } from "@calcom/prisma/enums";

import { deleteWatchlistEntryHandler } from "./deleteWatchlistEntry.handler";

vi.mock("@calcom/features/di/watchlist/containers/watchlist");
vi.mock("@calcom/features/watchlist/lib/repository/WatchlistRepository");

describe("deleteWatchlistEntryHandler", () => {
  const mockUser = {
    id: 1,
    email: "admin@example.com",
    organizationId: 100,
    profile: null,
  };

  const mockEntry = {
    id: "entry-123",
    type: WatchlistType.EMAIL,
    value: "spam@example.com",
    organizationId: 100,
    action: WatchlistAction.BLOCK,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    deleteWatchlistEntry: vi.fn(),
  };

  const mockWatchlistRepo = {
    findEntryWithAuditAndReports: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { getOrganizationWatchlistOperationsService } = await import(
      "@calcom/features/di/watchlist/containers/watchlist"
    );
    const { WatchlistRepository } = await import(
      "@calcom/features/watchlist/lib/repository/WatchlistRepository"
    );

    vi.mocked(getOrganizationWatchlistOperationsService).mockReturnValue(mockService as never);
    vi.mocked(WatchlistRepository).mockImplementation(function () {
      return mockWatchlistRepo as never;
    });
  });

  describe("access control", () => {
    it("should throw FORBIDDEN when user is not part of an organization", async () => {
      await expect(
        deleteWatchlistEntryHandler({
          ctx: { user: { ...mockUser, organizationId: undefined, profile: null } },
          input: {
            id: "entry-123",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You must be part of an organization to manage blocklist",
      });

      expect(mockService.deleteWatchlistEntry).not.toHaveBeenCalled();
    });
  });

  describe("validation in handler", () => {
    it("should throw NOT_FOUND when entry does not exist", async () => {
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: null,
        auditHistory: [],
      });

      await expect(
        deleteWatchlistEntryHandler({
          ctx: { user: mockUser },
          input: {
            id: "non-existent-id",
          },
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Blocklist entry not found",
      });
    });

    it("should throw FORBIDDEN when entry belongs to different organization", async () => {
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: { ...mockEntry, organizationId: 999 },
        auditHistory: [],
      });

      await expect(
        deleteWatchlistEntryHandler({
          ctx: { user: mockUser },
          input: {
            id: "entry-123",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You can only delete blocklist entries from your organization",
      });
    });
  });

  describe("error mapping from service", () => {
    it("should map PERMISSION_DENIED error to UNAUTHORIZED", async () => {
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: mockEntry,
        auditHistory: [],
      });
      mockService.deleteWatchlistEntry.mockRejectedValue(
        WatchlistErrors.permissionDenied("You are not authorized to delete blocklist entries")
      );

      await expect(
        deleteWatchlistEntryHandler({
          ctx: { user: mockUser },
          input: {
            id: "entry-123",
          },
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "You are not authorized to delete blocklist entries",
      });
    });

    it("should map unknown service errors to INTERNAL_SERVER_ERROR", async () => {
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: mockEntry,
        auditHistory: [],
      });
      mockService.deleteWatchlistEntry.mockRejectedValue(new Error("Database connection failed"));

      await expect(
        deleteWatchlistEntryHandler({
          ctx: { user: mockUser },
          input: {
            id: "entry-123",
          },
        })
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete blocklist entry",
      });
    });
  });

  describe("successful delegation", () => {
    it("should delegate to service with correct parameters", async () => {
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: mockEntry,
        auditHistory: [],
      });
      mockService.deleteWatchlistEntry.mockResolvedValue({
        success: true,
        message: "Blocklist entry deleted successfully",
      });

      const result = await deleteWatchlistEntryHandler({
        ctx: { user: mockUser },
        input: {
          id: "entry-123",
        },
      });

      expect(mockService.deleteWatchlistEntry).toHaveBeenCalledWith({
        entryId: "entry-123",
        userId: 1,
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("Blocklist entry deleted successfully");
    });
  });
});
