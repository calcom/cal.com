import { describe, it, expect, vi, beforeEach } from "vitest";

import type { PrismaClient } from "@calcom/prisma";
import { ReportReason } from "@calcom/prisma/enums";

import { BookingReportRepository } from "./booking-report.repository";
import type { CreateBookingReportInput } from "./booking-report.repository.interface";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("BookingReportRepository", () => {
  let repository: BookingReportRepository;

  const mockPrisma = {
    bookingReport: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  } as unknown as PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new BookingReportRepository(mockPrisma);
  });

  describe("createReport", () => {
    it("should create a booking report with all fields", async () => {
      const input: CreateBookingReportInput = {
        bookingId: 100,
        bookerEmail: "booker@example.com",
        reportedById: 1,
        reason: ReportReason.SPAM,
        description: "This is spam",
        cancelled: true,
      };

      const mockCreatedReport = { id: "report-123" };
      mockPrisma.bookingReport.create.mockResolvedValue(mockCreatedReport);

      const result = await repository.createReport(input);

      expect(result).toEqual({ id: "report-123" });
      expect(mockPrisma.bookingReport.create).toHaveBeenCalledWith({
        data: {
          bookingId: 100,
          bookerEmail: "booker@example.com",
          reportedById: 1,
          reason: ReportReason.SPAM,
          description: "This is spam",
          cancelled: true,
        },
        select: { id: true },
      });
    });

    it("should create a booking report without optional fields", async () => {
      const input: CreateBookingReportInput = {
        bookingId: 200,
        bookerEmail: "user@example.com",
        reportedById: 2,
        reason: ReportReason.DONT_KNOW_PERSON,
        cancelled: false,
      };

      const mockCreatedReport = { id: "report-456" };
      mockPrisma.bookingReport.create.mockResolvedValue(mockCreatedReport);

      const result = await repository.createReport(input);

      expect(result).toEqual({ id: "report-456" });
      expect(mockPrisma.bookingReport.create).toHaveBeenCalledWith({
        data: {
          bookingId: 200,
          bookerEmail: "user@example.com",
          reportedById: 2,
          reason: ReportReason.DONT_KNOW_PERSON,
          description: undefined,
          cancelled: false,
        },
        select: { id: true },
      });
    });

  });

  describe("findReportForBooking", () => {
    it("should find the report for a booking", async () => {
      const mockReport = {
        id: "report-123",
        reportedById: 1,
        reason: ReportReason.SPAM,
        description: "Spam booking",
        createdAt: new Date("2025-01-01T10:00:00Z"),
      };

      mockPrisma.bookingReport.findUnique.mockResolvedValue(mockReport);

      const result = await repository.findReportForBooking(100);

      expect(result).toEqual(mockReport);
      expect(mockPrisma.bookingReport.findUnique).toHaveBeenCalledWith({
        where: { bookingId: 100 },
        select: {
          id: true,
          reportedById: true,
          reason: true,
          description: true,
          createdAt: true,
        },
      });
    });

    it("should return null when no report exists", async () => {
      mockPrisma.bookingReport.findUnique.mockResolvedValue(null);

      const result = await repository.findReportForBooking(100);

      expect(result).toBeNull();
    });
  });

  describe("findAllReportedBookings", () => {
    it("should find all reported bookings with pagination", async () => {
      const mockReports = [
        {
          id: "report-1",
          reportedById: 1,
          reason: ReportReason.SPAM,
          description: "Spam",
          createdAt: new Date("2025-01-01T10:00:00Z"),
        },
        {
          id: "report-2",
          reportedById: 2,
          reason: ReportReason.DONT_KNOW_PERSON,
          description: null,
          createdAt: new Date("2025-01-01T11:00:00Z"),
        },
      ];

      mockPrisma.bookingReport.findMany.mockResolvedValue(mockReports);

      const result = await repository.findAllReportedBookings({ skip: 0, take: 10 });

      expect(result).toEqual(mockReports);
      expect(mockPrisma.bookingReport.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        select: {
          id: true,
          reportedById: true,
          reason: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
    });
  });
});
