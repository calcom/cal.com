import { describe, it, expect, vi, beforeEach } from "vitest";

import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";

import { deleteBookingReportHandler } from "./deleteBookingReport.handler";

vi.mock("@calcom/lib/server/repository/bookingReport");

describe("deleteBookingReportHandler (Admin)", () => {
  const mockUser = {
    id: 1,
    email: "admin@example.com",
    role: "ADMIN" as const,
  };

  const mockReportRepo = {
    deleteReport: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PrismaBookingReportRepository).mockImplementation(() => mockReportRepo as any);
  });

  describe("successful deletion", () => {
    it("should successfully delete report without organizationId requirement", async () => {
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

  describe("cross-organization access", () => {
    it("should allow admin to delete reports from any organization", async () => {
      mockReportRepo.deleteReport.mockResolvedValue(undefined);

      const result = await deleteBookingReportHandler({
        ctx: { user: mockUser },
        input: {
          reportId: "report-from-org-200",
        },
      });

      expect(result.success).toBe(true);
      expect(mockReportRepo.deleteReport).toHaveBeenCalledWith({
        reportId: "report-from-org-200",
      });
    });
  });
});
