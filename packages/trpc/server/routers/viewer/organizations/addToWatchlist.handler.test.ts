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
    addToWatchlistByEmail: vi.fn(),
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
            email: "spammer@example.com",
            type: WatchlistType.EMAIL,
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You must be part of an organization to add to watchlist",
      });

      expect(mockService.addToWatchlistByEmail).not.toHaveBeenCalled();
    });
  });

  describe("error mapping", () => {
    it("should propagate NOT_FOUND error from service", async () => {
      mockService.addToWatchlistByEmail.mockRejectedValue(
        WatchlistErrors.notFound("No pending reports found for this email")
      );

      await expect(
        addToWatchlistHandler({
          ctx: { user: mockUser },
          input: {
            email: "spammer@example.com",
            type: WatchlistType.EMAIL,
          },
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "No pending reports found for this email",
      });
    });

    it("should propagate PERMISSION_DENIED error from service", async () => {
      mockService.addToWatchlistByEmail.mockRejectedValue(
        WatchlistErrors.permissionDenied("You are not authorized to create watchlist entries")
      );

      await expect(
        addToWatchlistHandler({
          ctx: { user: mockUser },
          input: {
            email: "spammer@example.com",
            type: WatchlistType.EMAIL,
          },
        })
      ).rejects.toMatchObject({
        code: "PERMISSION_DENIED",
        message: "You are not authorized to create watchlist entries",
      });
    });

    it("should propagate ALREADY_IN_WATCHLIST error from service", async () => {
      mockService.addToWatchlistByEmail.mockRejectedValue(
        WatchlistErrors.alreadyInWatchlist("Email is already in the blocklist")
      );

      await expect(
        addToWatchlistHandler({
          ctx: { user: mockUser },
          input: {
            email: "spammer@example.com",
            type: WatchlistType.EMAIL,
          },
        })
      ).rejects.toMatchObject({
        code: "ALREADY_IN_WATCHLIST",
        message: "Email is already in the blocklist",
      });
    });

    it("should re-throw unknown service errors", async () => {
      const unknownError = new Error("Database connection failed");
      mockService.addToWatchlistByEmail.mockRejectedValue(unknownError);

      await expect(
        addToWatchlistHandler({
          ctx: { user: mockUser },
          input: {
            email: "spammer@example.com",
            type: WatchlistType.EMAIL,
          },
        })
      ).rejects.toThrow("Database connection failed");
    });
  });

  describe("successful delegation", () => {
    it("should delegate to service with correct parameters for email blocking", async () => {
      mockService.addToWatchlistByEmail.mockResolvedValue({
        success: true,
        addedCount: 2,
        skippedCount: 0,
        message: "Successfully added email to blocklist",
        results: [
          { reportId: "report-1", watchlistId: "watchlist-1" },
          { reportId: "report-2", watchlistId: "watchlist-1" },
        ],
      });

      const result = await addToWatchlistHandler({
        ctx: { user: mockUser },
        input: {
          email: "spammer@example.com",
          type: WatchlistType.EMAIL,
          description: "Spam user",
        },
      });

      expect(mockService.addToWatchlistByEmail).toHaveBeenCalledWith({
        email: "spammer@example.com",
        type: WatchlistType.EMAIL,
        description: "Spam user",
        userId: 1,
      });
      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(2);
    });

    it("should delegate to service with correct parameters for domain blocking", async () => {
      mockService.addToWatchlistByEmail.mockResolvedValue({
        success: true,
        addedCount: 5,
        skippedCount: 0,
        message: "Successfully added domain to blocklist",
        results: [],
      });

      const result = await addToWatchlistHandler({
        ctx: { user: mockUser },
        input: {
          email: "spammer@spamdomain.com",
          type: WatchlistType.DOMAIN,
          description: "Spam domain",
        },
      });

      expect(mockService.addToWatchlistByEmail).toHaveBeenCalledWith({
        email: "spammer@spamdomain.com",
        type: WatchlistType.DOMAIN,
        description: "Spam domain",
        userId: 1,
      });
      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(5);
    });
  });
});
