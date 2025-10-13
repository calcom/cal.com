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
          reportedById: 1,
          reason: BookingReportReason.SPAM,
          description: "Spam",
          createdAt: new Date("2025-01-01T10:00:00Z"),
        },
        {
          id: "report-2",
          reportedById: 2,
          reason: BookingReportReason.DONT_KNOW_PERSON,
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
