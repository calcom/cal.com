import type { PrismaClient } from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WrongAssignmentReportRepository } from "./WrongAssignmentReportRepository";

describe("WrongAssignmentReportRepository", () => {
  let repository: WrongAssignmentReportRepository;

  const mockPrisma = {
    wrongAssignmentReport: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  } as unknown as PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new WrongAssignmentReportRepository(mockPrisma);
  });

  describe("existsByBookingUid", () => {
    it("should return true when a report exists for the booking", async () => {
      mockPrisma.wrongAssignmentReport.findUnique.mockResolvedValue({ id: "report-123" });

      const result = await repository.existsByBookingUid("test-booking-uid");

      expect(result).toBe(true);
      expect(mockPrisma.wrongAssignmentReport.findUnique).toHaveBeenCalledWith({
        where: { bookingUid: "test-booking-uid" },
        select: { id: true },
      });
    });

    it("should return false when no report exists for the booking", async () => {
      mockPrisma.wrongAssignmentReport.findUnique.mockResolvedValue(null);

      const result = await repository.existsByBookingUid("non-existent-booking-uid");

      expect(result).toBe(false);
      expect(mockPrisma.wrongAssignmentReport.findUnique).toHaveBeenCalledWith({
        where: { bookingUid: "non-existent-booking-uid" },
        select: { id: true },
      });
    });

    it("should handle empty string bookingUid", async () => {
      mockPrisma.wrongAssignmentReport.findUnique.mockResolvedValue(null);

      const result = await repository.existsByBookingUid("");

      expect(result).toBe(false);
      expect(mockPrisma.wrongAssignmentReport.findUnique).toHaveBeenCalledWith({
        where: { bookingUid: "" },
        select: { id: true },
      });
    });
  });

  describe("createReport", () => {
    it("should create a report with all fields", async () => {
      const input = {
        bookingUid: "test-booking-uid",
        reportedById: 1,
        correctAssignee: "correct@example.com",
        additionalNotes: "This booking was assigned incorrectly",
        teamId: 5,
        routingFormId: "routing-form-123",
      };

      const mockCreatedReport = { id: "report-uuid-123" };
      mockPrisma.wrongAssignmentReport.create.mockResolvedValue(mockCreatedReport);

      const result = await repository.createReport(input);

      expect(result).toEqual({ id: "report-uuid-123" });
      expect(mockPrisma.wrongAssignmentReport.create).toHaveBeenCalledWith({
        data: input,
        select: { id: true },
      });
    });

    it("should create a report with null optional fields", async () => {
      const input = {
        bookingUid: "test-booking-uid-2",
        reportedById: 2,
        correctAssignee: null,
        additionalNotes: "Wrong person",
        teamId: null,
        routingFormId: null,
      };

      const mockCreatedReport = { id: "report-uuid-456" };
      mockPrisma.wrongAssignmentReport.create.mockResolvedValue(mockCreatedReport);

      const result = await repository.createReport(input);

      expect(result).toEqual({ id: "report-uuid-456" });
      expect(mockPrisma.wrongAssignmentReport.create).toHaveBeenCalledWith({
        data: input,
        select: { id: true },
      });
    });

    it("should create a report with empty additionalNotes", async () => {
      const input = {
        bookingUid: "test-booking-uid-3",
        reportedById: 3,
        correctAssignee: "someone@example.com",
        additionalNotes: "",
        teamId: 10,
        routingFormId: "routing-form-456",
      };

      const mockCreatedReport = { id: "report-uuid-789" };
      mockPrisma.wrongAssignmentReport.create.mockResolvedValue(mockCreatedReport);

      const result = await repository.createReport(input);

      expect(result).toEqual({ id: "report-uuid-789" });
      expect(mockPrisma.wrongAssignmentReport.create).toHaveBeenCalledWith({
        data: input,
        select: { id: true },
      });
    });

    it("should propagate database errors", async () => {
      const input = {
        bookingUid: "test-booking-uid",
        reportedById: 1,
        correctAssignee: null,
        additionalNotes: "Notes",
        teamId: null,
        routingFormId: null,
      };

      mockPrisma.wrongAssignmentReport.create.mockRejectedValue(new Error("Database connection failed"));

      await expect(repository.createReport(input)).rejects.toThrow("Database connection failed");
    });

    it("should propagate foreign key constraint errors", async () => {
      const input = {
        bookingUid: "non-existent-booking",
        reportedById: 999999,
        correctAssignee: null,
        additionalNotes: "Notes",
        teamId: null,
        routingFormId: null,
      };

      mockPrisma.wrongAssignmentReport.create.mockRejectedValue(
        new Error("Foreign key constraint failed on the field: `bookingUid`")
      );

      await expect(repository.createReport(input)).rejects.toThrow("Foreign key constraint failed");
    });
  });
});
