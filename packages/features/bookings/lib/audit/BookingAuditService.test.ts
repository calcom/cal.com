import { describe, it, expect, vi, beforeEach } from "vitest";

import { BookingAuditAction, getBookingAuditSchema } from "./bookingAudit.schemas";

// Mock Prisma client
const mockPrismaCreate = vi.fn();
const mockPrismaFindMany = vi.fn();

vi.mock("@calcom/prisma", () => ({
  default: {
    bookingAudit: {
      create: mockPrismaCreate,
      findMany: mockPrismaFindMany,
    },
  },
}));

// Mock logger
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      error: vi.fn(),
      info: vi.fn(),
    }),
  },
}));

describe("BookingAuditService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default mock behaviors
    mockPrismaCreate.mockResolvedValue({});
    mockPrismaFindMany.mockResolvedValue([]);
  });

  describe("Audit System Integration", () => {
    it("should create audit log for booking creation with valid data", async () => {
      const { BookingAuditService } = await import("./BookingAuditService");

      const mockResult = {
        id: "audit-123",
        bookingId: 1,
        action: BookingAuditAction.CREATED,
        data: {},
        createdAt: new Date(),
      };

      mockPrismaCreate.mockResolvedValue(mockResult);

      await BookingAuditService.logBookingCreated({
        bookingId: 1,
        eventTypeId: 1,
        eventTypeName: "Test Meeting",
        organizerId: 123,
        startTime: "2025-08-01T10:00:00.000Z",
        endTime: "2025-08-01T11:00:00.000Z",
        isConfirmed: true,
      });

      expect(mockPrismaCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: 1,
          action: BookingAuditAction.CREATED,
          data: expect.any(Object),
        }),
      });
    });

    it("should reject invalid booking cancellation data", () => {
      const invalidData = {
        bookingId: "not-a-number", // Invalid type
        action: BookingAuditAction.CANCELLED,
        data: {
          eventTypeId: "invalid", // Invalid type
          startTime: "not-a-date", // Invalid date format
          endTime: "not-a-date", // Invalid date format
        },
      };

      const schema = getBookingAuditSchema(BookingAuditAction.CANCELLED);
      const result = schema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it("should reject invalid booking reschedule data", () => {
      const invalidData = {
        bookingId: "not-a-number", // Invalid type
        action: BookingAuditAction.RESCHEDULED,
        data: {
          eventTypeId: "invalid", // Invalid type
          startTime: "not-a-date", // Invalid date format
          endTime: "not-a-date", // Invalid date format
          oldStartTime: "not-a-date", // Invalid date format
          oldEndTime: "not-a-date", // Invalid date format
          organizerChanged: "yes", // Invalid type
        },
      };

      const schema = getBookingAuditSchema(BookingAuditAction.RESCHEDULED);
      const result = schema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it("should create audit log for booking cancellation", async () => {
      const { BookingAuditService } = await import("./BookingAuditService");

      const mockResult = {
        id: "audit-124",
        bookingId: 2,
        action: BookingAuditAction.CANCELLED,
        data: {},
        createdAt: new Date(),
      };

      mockPrismaCreate.mockResolvedValue(mockResult);

      await BookingAuditService.logBookingCancelled({
        bookingId: 2,
        eventTypeId: 1,
        startTime: new Date("2025-08-01T10:00:00.000Z"),
        endTime: new Date("2025-08-01T11:00:00.000Z"),
        cancellationReason: "Meeting cancelled",
      });

      expect(mockPrismaCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: 2,
          action: BookingAuditAction.CANCELLED,
        }),
      });
    });

    it("should create audit log for booking reschedule", async () => {
      const { BookingAuditService } = await import("./BookingAuditService");

      const mockResult = {
        id: "audit-125",
        bookingId: 3,
        action: BookingAuditAction.RESCHEDULED,
        data: {},
        createdAt: new Date(),
      };

      mockPrismaCreate.mockResolvedValue(mockResult);

      await BookingAuditService.logBookingRescheduled({
        bookingId: 3,
        eventTypeId: 1,
        originalStartTime: new Date("2025-08-01T10:00:00.000Z"),
        originalEndTime: new Date("2025-08-01T11:00:00.000Z"),
        newStartTime: new Date("2025-08-02T10:00:00.000Z"),
        newEndTime: new Date("2025-08-02T11:00:00.000Z"),
      });

      expect(mockPrismaCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: 3,
          action: BookingAuditAction.RESCHEDULED,
        }),
      });
    });

    it("should retrieve audit logs for a booking", async () => {
      const { BookingAuditService } = await import("./BookingAuditService");

      const mockLogs = [
        {
          id: "audit-123",
          bookingId: 1,
          action: BookingAuditAction.CREATED,
          data: {},
          createdAt: new Date(),
        },
        {
          id: "audit-124",
          bookingId: 1,
          action: BookingAuditAction.CANCELLED,
          data: {},
          createdAt: new Date(),
        },
      ];

      mockPrismaFindMany.mockResolvedValue(mockLogs);

      const result = await BookingAuditService.getAuditLogs(1);

      expect(result).toEqual(mockLogs);
      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        select: {
          id: true,
          bookingId: true,
          action: true,
          data: true,
          createdAt: true,
          actor: true,
          version: true,
        },
        where: { bookingId: 1 },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should handle errors gracefully and not throw", async () => {
      const { BookingAuditService } = await import("./BookingAuditService");

      // Mock Prisma to reject with an error
      mockPrismaCreate.mockRejectedValue(new Error("Database error"));

      // The service should not throw errors, it should log them
      await expect(
        BookingAuditService.logBookingCreated({
          bookingId: 1,
          eventTypeId: 1,
          eventTypeName: "Test Meeting",
          organizerId: 123,
          startTime: "2025-08-01T10:00:00.000Z",
          endTime: "2025-08-01T11:00:00.000Z",
          isConfirmed: true,
        })
      ).resolves.toBeUndefined();
    });
  });
});
