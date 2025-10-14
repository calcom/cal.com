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
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
          bookingUid: "uid-1",
          bookerEmail: "a@example.com",
          reportedById: 1,
          reason: BookingReportReason.SPAM,
          description: "Spam",
          cancelled: false,
          createdAt: new Date("2025-01-01T10:00:00Z"),
          watchlistId: null,
          reportedBy: { id: 1, name: "Admin", email: "admin@example.com" },
          booking: { id: 1, startTime: new Date(), endTime: new Date(), title: "t", uid: "uid-1" },
          watchlist: null,
        },
        {
          id: "report-2",
          bookingUid: "uid-2",
          bookerEmail: "b@example.com",
          reportedById: 2,
          reason: BookingReportReason.DONT_KNOW_PERSON,
          description: null,
          cancelled: true,
          createdAt: new Date("2025-01-01T11:00:00Z"),
          watchlistId: null,
          reportedBy: { id: 2, name: "User", email: "user@example.com" },
          booking: { id: 2, startTime: new Date(), endTime: new Date(), title: "t2", uid: "uid-2" },
          watchlist: null,
        },
      ];

      mockPrisma.bookingReport.count.mockResolvedValue(mockReports.length);
      mockPrisma.bookingReport.findMany.mockResolvedValue(mockReports);

      const result = await repository.findAllReportedBookings({ organizationId: 10, skip: 0, take: 10 });

      expect(result.meta.totalRowCount).toBe(2);
      expect(result.rows).toEqual(
        mockReports.map((r) => ({ ...r, reporter: r.reportedBy }))
      );
      expect(mockPrisma.bookingReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 10 }),
          skip: 0,
          take: 10,
        })
      );
      expect(mockPrisma.bookingReport.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organizationId: 10 }) })
      );
    });
  });
});
