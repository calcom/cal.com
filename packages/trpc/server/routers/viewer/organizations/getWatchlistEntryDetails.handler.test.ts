import { WatchlistErrors } from "@calcom/features/watchlist/lib/errors/WatchlistErrors";
import { WatchlistAction, WatchlistType } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWatchlistEntryDetailsHandler } from "./getWatchlistEntryDetails.handler";

vi.mock("@calcom/features/di/watchlist/containers/watchlist");

describe("getWatchlistEntryDetailsHandler", () => {
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
    description: "Known spammer",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-02"),
  };

  const mockAuditHistory = [
    {
      id: "audit-1",
      watchlistId: "entry-123",
      action: "CREATED" as const,
      changedByUserId: 1,
      timestamp: new Date("2025-01-01"),
      previousValue: null,
      newValue: "spam@example.com",
      changedByUser: { id: 1, name: "Admin", email: "admin@example.com" },
    },
  ];

  const mockService = {
    getWatchlistEntryDetails: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { getOrganizationWatchlistQueryService } = await import(
      "@calcom/features/di/watchlist/containers/watchlist"
    );
    vi.mocked(getOrganizationWatchlistQueryService).mockReturnValue(mockService as never);
  });

  describe("access control", () => {
    it("should throw FORBIDDEN when user is not part of an organization", async () => {
      await expect(
        getWatchlistEntryDetailsHandler({
          ctx: { user: { ...mockUser, organizationId: undefined, profile: null } },
          input: {
            id: "entry-123",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You must be part of an organization to view blocklist",
      });

      expect(mockService.getWatchlistEntryDetails).not.toHaveBeenCalled();
    });
  });

  describe("error mapping", () => {
    it("should map NOT_FOUND error to NOT_FOUND", async () => {
      mockService.getWatchlistEntryDetails.mockRejectedValue(
        WatchlistErrors.notFound("Blocklist entry not found")
      );

      await expect(
        getWatchlistEntryDetailsHandler({
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

    it("should map PERMISSION_DENIED error to FORBIDDEN", async () => {
      mockService.getWatchlistEntryDetails.mockRejectedValue(
        WatchlistErrors.permissionDenied("You are not authorized to view blocklist entries")
      );

      await expect(
        getWatchlistEntryDetailsHandler({
          ctx: { user: mockUser },
          input: {
            id: "entry-123",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You are not authorized to view blocklist entries",
      });
    });

    it("should map unknown service errors to INTERNAL_SERVER_ERROR", async () => {
      mockService.getWatchlistEntryDetails.mockRejectedValue(new Error("Database connection failed"));

      await expect(
        getWatchlistEntryDetailsHandler({
          ctx: { user: mockUser },
          input: {
            id: "entry-123",
          },
        })
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get blocklist entry details",
      });
    });
  });

  describe("successful delegation", () => {
    it("should delegate to service with correct parameters", async () => {
      mockService.getWatchlistEntryDetails.mockResolvedValue({
        entry: mockEntry,
        auditHistory: mockAuditHistory,
      });

      const result = await getWatchlistEntryDetailsHandler({
        ctx: { user: mockUser },
        input: {
          id: "entry-123",
        },
      });

      expect(mockService.getWatchlistEntryDetails).toHaveBeenCalledWith({
        organizationId: 100,
        userId: 1,
        entryId: "entry-123",
      });
      expect(result.entry).toEqual(mockEntry);
      expect(result.auditHistory).toEqual(mockAuditHistory);
    });

    it("should use profile.organizationId when available", async () => {
      mockService.getWatchlistEntryDetails.mockResolvedValue({
        entry: { ...mockEntry, organizationId: 200 },
        auditHistory: [],
      });

      await getWatchlistEntryDetailsHandler({
        ctx: {
          user: {
            ...mockUser,
            organizationId: undefined,
            profile: { organizationId: 200 },
          },
        },
        input: {
          id: "entry-123",
        },
      });

      expect(mockService.getWatchlistEntryDetails).toHaveBeenCalledWith({
        organizationId: 200,
        userId: 1,
        entryId: "entry-123",
      });
    });
  });
});
