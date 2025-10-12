import { describe, it, expect, vi, beforeEach } from "vitest";

import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";

import { deleteBookingReportHandler } from "./deleteBookingReport.handler";

vi.mock("@calcom/lib/server/repository/bookingReport");

describe("deleteBookingReportHandler", () => {
  const mockUser = {
    id: 1,
    email: "admin@example.com",
    organizationId: 100,
  };

  const mockReportRepo = {
    deleteReport: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PrismaBookingReportRepository).mockImplementation(() => mockReportRepo as any);
  });

  describe("access control", () => {
    it("should throw UNAUTHORIZED when user is not part of an organization", async () => {
      await expect(
        deleteBookingReportHandler({
          ctx: { user: { ...mockUser, organizationId: undefined } },
          input: {
            reportId: "report-123",
          },
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "User must be part of an organization",
      });

      expect(mockReportRepo.deleteReport).not.toHaveBeenCalled();
    });
  });

  describe("successful deletion", () => {
    it("should successfully delete report when user has organizationId", async () => {
      mockReportRepo.deleteReport.mockResolvedValue(undefined);

      const result = await deleteBookingReportHandler({
        ctx: { user: mockUser },
        input: {
          reportId: "report-123",
        },
      });

      expect(result.success).toBe(true);
      expect(mockReportRepo.deleteReport).toHaveBeenCalledWith({
        reportId: "report-123",
        organizationId: 100,
      });
    });

    it("should call repository deleteReport with correct parameters", async () => {
      mockReportRepo.deleteReport.mockResolvedValue(undefined);

      await deleteBookingReportHandler({
        ctx: { user: mockUser },
        input: {
          reportId: "different-report-456",
        },
      });

      expect(mockReportRepo.deleteReport).toHaveBeenCalledWith({
        reportId: "different-report-456",
        organizationId: 100,
      });
      expect(mockReportRepo.deleteReport).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("should propagate repository errors when report not found", async () => {
      mockReportRepo.deleteReport.mockRejectedValue(new Error("Report not found"));

      await expect(
        deleteBookingReportHandler({
          ctx: { user: mockUser },
          input: {
            reportId: "non-existent-report",
          },
        })
      ).rejects.toThrow("Report not found");
    });
  });
});
