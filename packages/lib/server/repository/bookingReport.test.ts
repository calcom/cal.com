import { describe, it, expect, vi, beforeEach } from "vitest";

import type { PrismaClient } from "@calcom/prisma";
import { BookingReportReason } from "@calcom/prisma/enums";

import { PrismaBookingReportRepository } from "./bookingReport";
import type { CreateBookingReportInput } from "./bookingReport.interface";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("PrismaBookingReportRepository", () => {
  let repository: PrismaBookingReportRepository;

  const mockPrisma = {
    bookingReport: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
  } as unknown as PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaBookingReportRepository(mockPrisma);
  });

  describe("createReport", () => {
    it("should create a booking report with all fields", async () => {
      const input: CreateBookingReportInput = {
        bookingUid: "test-booking-uid-1",
        bookerEmail: "booker@example.com",
        reportedById: 1,
        reason: BookingReportReason.SPAM,
        description: "This is spam",
        cancelled: true,
        organizationId: 10,
      };

      const mockCreatedReport = { id: "report-123" };
      mockPrisma.bookingReport.create.mockResolvedValue(mockCreatedReport);

      const result = await repository.createReport(input);

      expect(result).toEqual({ id: "report-123" });
      expect(mockPrisma.bookingReport.create).toHaveBeenCalledWith({
        data: {
          bookingUid: "test-booking-uid-1",
          bookerEmail: "booker@example.com",
          reportedById: 1,
          reason: BookingReportReason.SPAM,
          description: "This is spam",
          cancelled: true,
          organizationId: 10,
        },
        select: { id: true },
      });
    });

    it("should create a booking report without optional fields", async () => {
      const input: CreateBookingReportInput = {
        bookingUid: "test-booking-uid-2",
        bookerEmail: "user@example.com",
        reportedById: 2,
        reason: BookingReportReason.DONT_KNOW_PERSON,
        cancelled: false,
      };

      const mockCreatedReport = { id: "report-456" };
      mockPrisma.bookingReport.create.mockResolvedValue(mockCreatedReport);

      const result = await repository.createReport(input);

      expect(result).toEqual({ id: "report-456" });
      expect(mockPrisma.bookingReport.create).toHaveBeenCalledWith({
        data: {
          bookingUid: "test-booking-uid-2",
          bookerEmail: "user@example.com",
          reportedById: 2,
          reason: BookingReportReason.DONT_KNOW_PERSON,
          description: undefined,
          cancelled: false,
          organizationId: undefined,
        },
        select: { id: true },
      });
    });
  });

  describe("findAllReportedBookings", () => {
    it("should find all reported bookings with pagination", async () => {
      const mockReports = [
        {
          id: "report-1",
          bookingUid: "booking-1",
          bookerEmail: "user1@example.com",
          reportedById: 1,
          reason: BookingReportReason.SPAM,
          description: "Spam",
          cancelled: false,
          createdAt: new Date("2025-01-01T10:00:00Z"),
          status: "PENDING",
          watchlistId: null,
          reportedBy: null,
          booking: {
            id: 1,
            uid: "booking-1",
            title: "Test Booking",
            startTime: new Date(),
            endTime: new Date(),
          },
          watchlist: null,
        },
        {
          id: "report-2",
          bookingUid: "booking-2",
          bookerEmail: "user2@example.com",
          reportedById: 2,
          reason: BookingReportReason.DONT_KNOW_PERSON,
          description: null,
          cancelled: false,
          createdAt: new Date("2025-01-01T11:00:00Z"),
          status: "PENDING",
          watchlistId: null,
          reportedBy: null,
          booking: {
            id: 2,
            uid: "booking-2",
            title: "Test Booking 2",
            startTime: new Date(),
            endTime: new Date(),
          },
          watchlist: null,
        },
      ];

      mockPrisma.bookingReport.findMany.mockResolvedValue(mockReports);
      mockPrisma.bookingReport.count.mockResolvedValue(2);

      const result = await repository.findAllReportedBookings({ skip: 0, take: 10 });

      expect(result).toEqual({
        rows: mockReports.map((r) => ({ ...r, reporter: r.reportedBy })),
        meta: { totalRowCount: 2 },
      });
      expect(mockPrisma.bookingReport.findMany).toHaveBeenCalled();
      expect(mockPrisma.bookingReport.count).toHaveBeenCalled();
    });
  });

  describe("updateReportStatus", () => {
    it("should update report status with organizationId", async () => {
      mockPrisma.bookingReport.updateMany.mockResolvedValue({ count: 1 });

      await repository.updateReportStatus({
        reportId: "report-123",
        status: "BLOCKED",
        organizationId: 100,
      });

      expect(mockPrisma.bookingReport.updateMany).toHaveBeenCalledWith({
        where: {
          id: "report-123",
          organizationId: 100,
        },
        data: { status: "BLOCKED" },
      });
    });

    it("should update report status without organizationId", async () => {
      mockPrisma.bookingReport.updateMany.mockResolvedValue({ count: 1 });

      await repository.updateReportStatus({
        reportId: "report-456",
        status: "DISMISSED",
      });

      expect(mockPrisma.bookingReport.updateMany).toHaveBeenCalledWith({
        where: {
          id: "report-456",
        },
        data: { status: "DISMISSED" },
      });
    });

    it("should update report status to PENDING", async () => {
      mockPrisma.bookingReport.updateMany.mockResolvedValue({ count: 1 });

      await repository.updateReportStatus({
        reportId: "report-789",
        status: "PENDING",
        organizationId: 200,
      });

      expect(mockPrisma.bookingReport.updateMany).toHaveBeenCalledWith({
        where: {
          id: "report-789",
          organizationId: 200,
        },
        data: { status: "PENDING" },
      });
    });
  });
});
