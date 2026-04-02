import { WatchlistErrors } from "@calcom/features/watchlist/lib/errors/WatchlistErrors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dismissBookingReportHandler } from "./dismissBookingReport.handler";

vi.mock("@calcom/features/di/watchlist/containers/watchlist");

describe("dismissBookingReportHandler", () => {
  const mockUser = {
    id: 1,
    email: "admin@example.com",
    organizationId: 100,
    profile: null,
  };

  const mockService = {
    dismissReportByEmail: vi.fn(),
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
      const userWithoutOrg = { ...mockUser, organizationId: null, profile: null };

      await expect(
        dismissBookingReportHandler({
          ctx: { user: userWithoutOrg },
          input: { email: "spammer@example.com" },
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: "FORBIDDEN",
          message: "You must be part of an organization to dismiss booking reports",
        })
      );

      expect(mockService.dismissReportByEmail).not.toHaveBeenCalled();
    });

    it("should throw UNAUTHORIZED when user lacks permission", async () => {
      mockService.dismissReportByEmail.mockRejectedValue(
        WatchlistErrors.permissionDenied("You are not authorized to update watchlist entries")
      );

      await expect(
        dismissBookingReportHandler({
          ctx: { user: mockUser },
          input: { email: "spammer@example.com" },
        })
      ).rejects.toMatchObject({
        code: "PERMISSION_DENIED",
        message: "You are not authorized to update watchlist entries",
      });
    });
  });

  describe("report verification", () => {
    it("should throw NOT_FOUND when no pending reports exist for email", async () => {
      mockService.dismissReportByEmail.mockRejectedValue(
        WatchlistErrors.notFound("No pending reports found for this email")
      );

      await expect(
        dismissBookingReportHandler({
          ctx: { user: mockUser },
          input: { email: "nonexistent@example.com" },
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "No pending reports found for this email",
      });

      expect(mockService.dismissReportByEmail).toHaveBeenCalledWith({
        email: "nonexistent@example.com",
        userId: 1,
      });
    });
  });

  describe("successful dismissal", () => {
    it("should successfully dismiss all booking reports for an email", async () => {
      mockService.dismissReportByEmail.mockResolvedValue({
        success: true,
        count: 3,
      });

      const result = await dismissBookingReportHandler({
        ctx: { user: mockUser },
        input: { email: "spammer@example.com" },
      });

      expect(result).toEqual({ success: true, dismissed: 3 });
      expect(mockService.dismissReportByEmail).toHaveBeenCalledWith({
        email: "spammer@example.com",
        userId: 1,
      });
    });

    it("should dismiss a single report when only one exists", async () => {
      mockService.dismissReportByEmail.mockResolvedValue({
        success: true,
        count: 1,
      });

      const result = await dismissBookingReportHandler({
        ctx: { user: mockUser },
        input: { email: "single-report@example.com" },
      });

      expect(result).toEqual({ success: true, dismissed: 1 });
    });
  });
});
