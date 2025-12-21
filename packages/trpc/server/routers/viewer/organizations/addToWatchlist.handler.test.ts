import { describe, it, expect, vi, beforeEach } from "vitest";

import { WatchlistErrors } from "@calcom/features/watchlist/lib/errors/WatchlistErrors";
import { WatchlistType } from "@calcom/prisma/enums";

import { addToWatchlistHandler } from "./addToWatchlist.handler";

vi.mock("@calcom/features/di/watchlist/containers/watchlist");

describe("addToWatchlistHandler (Organization)", () => {
  const mockUser = {
    id: 1,
    email: "admin@example.com",
    organizationId: 100,
    profile: null,
  };

  const mockService = {
    addReportsToWatchlist: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { getOrganizationWatchlistOperationsService } = await import(
      "@calcom/features/di/watchlist/containers/watchlist"
    );
    vi.mocked(getOrganizationWatchlistOperationsService).mockReturnValue(mockService as never);
  });

  describe("access control", () => {
    it("should throw FORBIDDEN when user is not part of an organization", async () => {
      await expect(
        addToWatchlistHandler({
          ctx: { user: { ...mockUser, organizationId: undefined, profile: null } },
          input: {
            reportIds: ["report-1"],
            type: WatchlistType.EMAIL,
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You must be part of an organization to add to watchlist",
      });

      expect(mockService.addReportsToWatchlist).not.toHaveBeenCalled();
    });
  });

  describe("error mapping", () => {
    it("should map NOT_FOUND error to NOT_FOUND", async () => {
      mockService.addReportsToWatchlist.mockRejectedValue(
        WatchlistErrors.notFound("Booking report(s) not found: report-1")
      );

      await expect(
        addToWatchlistHandler({
          ctx: { user: mockUser },
          input: {
            reportIds: ["report-1"],
            type: WatchlistType.EMAIL,
          },
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Booking report(s) not found: report-1",
      });
    });

    it("should map PERMISSION_DENIED error to UNAUTHORIZED", async () => {
      mockService.addReportsToWatchlist.mockRejectedValue(
        WatchlistErrors.permissionDenied("You are not authorized to add entries to the watchlist")
      );

      await expect(
        addToWatchlistHandler({
          ctx: { user: mockUser },
          input: {
            reportIds: ["report-1"],
            type: WatchlistType.EMAIL,
          },
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "You are not authorized to add entries to the watchlist",
      });
    });

    it("should map ALREADY_IN_WATCHLIST error to BAD_REQUEST", async () => {
      mockService.addReportsToWatchlist.mockRejectedValue(
        WatchlistErrors.alreadyInWatchlist("All selected bookers are already in the watchlist")
      );

      await expect(
        addToWatchlistHandler({
          ctx: { user: mockUser },
          input: {
            reportIds: ["report-1"],
            type: WatchlistType.EMAIL,
          },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "All selected bookers are already in the watchlist",
      });
    });

    it("should re-throw unknown service errors", async () => {
      const unknownError = new Error("Database connection failed");
      mockService.addReportsToWatchlist.mockRejectedValue(unknownError);

      await expect(
        addToWatchlistHandler({
          ctx: { user: mockUser },
          input: {
            reportIds: ["report-1"],
            type: WatchlistType.EMAIL,
          },
        })
      ).rejects.toThrow("Database connection failed");
    });
  });

  describe("successful delegation", () => {
    it("should delegate to service with correct parameters", async () => {
      mockService.addReportsToWatchlist.mockResolvedValue({
        success: true,
        addedCount: 2,
        message: "Successfully added 2 entries to watchlist",
      });

      const result = await addToWatchlistHandler({
        ctx: { user: mockUser },
        input: {
          reportIds: ["report-1", "report-2"],
          type: WatchlistType.EMAIL,
          description: "Spam users",
        },
      });

      expect(mockService.addReportsToWatchlist).toHaveBeenCalledWith({
        reportIds: ["report-1", "report-2"],
        type: WatchlistType.EMAIL,
        description: "Spam users",
        userId: 1,
      });
      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(2);
    });
  });
});
