import { describe, it, expect, vi, beforeEach } from "vitest";

import type { PrismaClient } from "@calcom/prisma";
import { BookingReportReason } from "@calcom/prisma/enums";

import type { CreateBookingReportInput } from "./IBookingReportRepository";
import { PrismaBookingReportRepository } from "./PrismaBookingReportRepository";

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
      update: vi.fn(),
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
          systemStatus: "PENDING",
          watchlistId: null,
          globalWatchlistId: null,
          organizationId: null,
          reportedBy: null,
          booking: {
            id: 1,
            uid: "booking-1",
            title: "Test Booking",
            startTime: new Date(),
            endTime: new Date(),
          },
          watchlist: null,
          globalWatchlist: null,
          organization: null,
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
          systemStatus: "PENDING",
          watchlistId: null,
          globalWatchlistId: null,
          organizationId: null,
          reportedBy: null,
          booking: {
            id: 2,
            uid: "booking-2",
            title: "Test Booking 2",
            startTime: new Date(),
            endTime: new Date(),
          },
          watchlist: null,
          globalWatchlist: null,
          organization: null,
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

  describe("updateSystemReportStatus", () => {
    it("should update systemStatus with globalWatchlistId", async () => {
      mockPrisma.bookingReport.update.mockResolvedValue({ id: "report-1" });

      await repository.updateSystemReportStatus({
        reportId: "report-123",
        systemStatus: "BLOCKED",
        globalWatchlistId: "watchlist-456",
      });

      expect(mockPrisma.bookingReport.update).toHaveBeenCalledWith({
        where: { id: "report-123" },
        data: {
          systemStatus: "BLOCKED",
          globalWatchlistId: "watchlist-456",
        },
      });
    });

    it("should update systemStatus without globalWatchlistId", async () => {
      mockPrisma.bookingReport.update.mockResolvedValue({ id: "report-1" });

      await repository.updateSystemReportStatus({
        reportId: "report-456",
        systemStatus: "DISMISSED",
      });

      expect(mockPrisma.bookingReport.update).toHaveBeenCalledWith({
        where: { id: "report-456" },
        data: {
          systemStatus: "DISMISSED",
        },
      });
    });
  });

  describe("bulkUpdateSystemReportStatus", () => {
    it("should bulk update systemStatus with globalWatchlistId", async () => {
      mockPrisma.bookingReport.updateMany.mockResolvedValue({ count: 3 });

      const result = await repository.bulkUpdateSystemReportStatus({
        reportIds: ["r1", "r2", "r3"],
        systemStatus: "BLOCKED",
        globalWatchlistId: "global-1",
      });

      expect(result).toEqual({ updated: 3 });
      expect(mockPrisma.bookingReport.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["r1", "r2", "r3"] } },
        data: {
          systemStatus: "BLOCKED",
          globalWatchlistId: "global-1",
        },
      });
    });

    it("should bulk update systemStatus without globalWatchlistId", async () => {
      mockPrisma.bookingReport.updateMany.mockResolvedValue({ count: 2 });

      const result = await repository.bulkUpdateSystemReportStatus({
        reportIds: ["r1", "r2"],
        systemStatus: "DISMISSED",
      });

      expect(result).toEqual({ updated: 2 });
      expect(mockPrisma.bookingReport.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["r1", "r2"] } },
        data: {
          systemStatus: "DISMISSED",
        },
      });
    });
  });

  describe("countSystemPendingReports", () => {
    it("should count reports with systemStatus PENDING", async () => {
      mockPrisma.bookingReport.count.mockResolvedValue(5);

      const result = await repository.countSystemPendingReports();

      expect(result).toBe(5);
      expect(mockPrisma.bookingReport.count).toHaveBeenCalledWith({
        where: { systemStatus: "PENDING" },
      });
    });
  });

  describe("bulkLinkGlobalWatchlistWithSystemStatus", () => {
    it("should do nothing when links array is empty", async () => {
      await repository.bulkLinkGlobalWatchlistWithSystemStatus({
        links: [],
        systemStatus: "BLOCKED",
      });

      expect(mockPrisma.bookingReport.updateMany).not.toHaveBeenCalled();
    });

    it("should link each report to its corresponding globalWatchlistId", async () => {
      mockPrisma.bookingReport.updateMany.mockResolvedValue({ count: 1 });

      await repository.bulkLinkGlobalWatchlistWithSystemStatus({
        links: [
          { reportId: "r1", globalWatchlistId: "w1" },
          { reportId: "r2", globalWatchlistId: "w2" },
          { reportId: "r3", globalWatchlistId: "w3" },
        ],
        systemStatus: "BLOCKED",
      });

      expect(mockPrisma.bookingReport.updateMany).toHaveBeenCalledTimes(3);
      expect(mockPrisma.bookingReport.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["r1"] } },
        data: { globalWatchlistId: "w1", systemStatus: "BLOCKED" },
      });
      expect(mockPrisma.bookingReport.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["r2"] } },
        data: { globalWatchlistId: "w2", systemStatus: "BLOCKED" },
      });
      expect(mockPrisma.bookingReport.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["r3"] } },
        data: { globalWatchlistId: "w3", systemStatus: "BLOCKED" },
      });
    });

    it("should group reports with the same globalWatchlistId", async () => {
      mockPrisma.bookingReport.updateMany.mockResolvedValue({ count: 2 });

      await repository.bulkLinkGlobalWatchlistWithSystemStatus({
        links: [
          { reportId: "r1", globalWatchlistId: "w1" },
          { reportId: "r2", globalWatchlistId: "w1" },
          { reportId: "r3", globalWatchlistId: "w2" },
        ],
        systemStatus: "BLOCKED",
      });

      expect(mockPrisma.bookingReport.updateMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.bookingReport.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["r1", "r2"] } },
        data: { globalWatchlistId: "w1", systemStatus: "BLOCKED" },
      });
      expect(mockPrisma.bookingReport.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["r3"] } },
        data: { globalWatchlistId: "w2", systemStatus: "BLOCKED" },
      });
    });
  });
});
