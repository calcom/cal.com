import { describe, it, expect, vi, beforeEach } from "vitest";

import { WatchlistErrors } from "@calcom/features/watchlist/lib/errors/WatchlistErrors";
import { WatchlistType } from "@calcom/prisma/enums";

import { createWatchlistEntryHandler } from "./createWatchlistEntry.handler";

vi.mock("@calcom/features/di/watchlist/containers/watchlist");

describe("createWatchlistEntryHandler", () => {
  const mockUser = {
    id: 1,
    email: "admin@example.com",
    organizationId: 100,
    profile: null,
  };

  const mockService = {
    createWatchlistEntry: vi.fn(),
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
        createWatchlistEntryHandler({
          ctx: { user: { ...mockUser, organizationId: undefined, profile: null } as never },
          input: {
            type: WatchlistType.EMAIL,
            value: "spam@example.com",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You must be part of an organization to manage blocklist",
      });

      expect(mockService.createWatchlistEntry).not.toHaveBeenCalled();
    });
  });

  describe("error mapping", () => {
    it("should map INVALID_EMAIL error to BAD_REQUEST", async () => {
      mockService.createWatchlistEntry.mockRejectedValue(
        WatchlistErrors.invalidEmail("Invalid email address format")
      );

      await expect(
        createWatchlistEntryHandler({
          ctx: { user: mockUser as never },
          input: {
            type: WatchlistType.EMAIL,
            value: "invalid-email",
          },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Invalid email address format",
      });
    });

    it("should map INVALID_DOMAIN error to BAD_REQUEST", async () => {
      mockService.createWatchlistEntry.mockRejectedValue(
        WatchlistErrors.invalidDomain("Invalid domain format (e.g., example.com)")
      );

      await expect(
        createWatchlistEntryHandler({
          ctx: { user: mockUser as never },
          input: {
            type: WatchlistType.DOMAIN,
            value: "invalid..domain",
          },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Invalid domain format (e.g., example.com)",
      });
    });

    it("should map PERMISSION_DENIED error to UNAUTHORIZED", async () => {
      mockService.createWatchlistEntry.mockRejectedValue(
        WatchlistErrors.permissionDenied("You are not authorized to create blocklist entries")
      );

      await expect(
        createWatchlistEntryHandler({
          ctx: { user: mockUser as never },
          input: {
            type: WatchlistType.EMAIL,
            value: "spam@example.com",
          },
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "You are not authorized to create blocklist entries",
      });
    });

    it("should re-throw unknown service errors", async () => {
      const unknownError = new Error("Database connection failed");
      mockService.createWatchlistEntry.mockRejectedValue(unknownError);

      await expect(
        createWatchlistEntryHandler({
          ctx: { user: mockUser as never },
          input: {
            type: WatchlistType.EMAIL,
            value: "spam@example.com",
          },
        })
      ).rejects.toThrow("Database connection failed");
    });
  });

  describe("successful delegation", () => {
    it("should delegate to service with correct parameters for EMAIL", async () => {
      const mockEntry = {
        id: "watchlist-1",
        type: WatchlistType.EMAIL,
        value: "spam@example.com",
        organizationId: 100,
      };

      mockService.createWatchlistEntry.mockResolvedValue({
        success: true,
        entry: mockEntry,
      });

      const result = await createWatchlistEntryHandler({
        ctx: { user: mockUser as never },
        input: {
          type: WatchlistType.EMAIL,
          value: "spam@example.com",
          description: "Known spammer",
        },
      });

      expect(mockService.createWatchlistEntry).toHaveBeenCalledWith({
        type: WatchlistType.EMAIL,
        value: "spam@example.com",
        description: "Known spammer",
        userId: 1,
      });
      expect(result.success).toBe(true);
      expect(result.entry).toEqual(mockEntry);
    });

    it("should delegate to service with correct parameters for DOMAIN", async () => {
      const mockEntry = {
        id: "watchlist-2",
        type: WatchlistType.DOMAIN,
        value: "spammer.com",
        organizationId: 100,
      };

      mockService.createWatchlistEntry.mockResolvedValue({
        success: true,
        entry: mockEntry,
      });

      const result = await createWatchlistEntryHandler({
        ctx: { user: mockUser as never },
        input: {
          type: WatchlistType.DOMAIN,
          value: "spammer.com",
        },
      });

      expect(mockService.createWatchlistEntry).toHaveBeenCalledWith({
        type: WatchlistType.DOMAIN,
        value: "spammer.com",
        description: undefined,
        userId: 1,
      });
      expect(result.success).toBe(true);
      expect(result.entry).toEqual(mockEntry);
    });
  });
});
