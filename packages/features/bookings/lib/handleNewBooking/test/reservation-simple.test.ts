/**
 * Simplified tests for reservation system logic
 * Tests the core reservation validation without complex booking scenario setup
 */

import { describe, expect, test, beforeEach, afterAll, vi } from "vitest";
import prismaMock from "../../../../../../tests/libs/__mocks__/prisma";
import dayjs from "@calcom/dayjs";
import { BookingStatus } from "@calcom/prisma/enums";
import { HttpError } from "@calcom/lib/http-error";

// Import the core function that contains our reservation logic
import { createBooking } from "../createBooking";

describe("Reservation System Core Logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00.000Z"));
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test("should successfully consume valid reservation", async () => {
    // Mock valid reservation
    const validReservation = {
      id: 1,
      uid: "test-reservation-123",
      eventTypeId: 1,
      userId: 101,
      slotUtcStartDate: dayjs("2025-01-16T10:00:00.000Z").toDate(),
      slotUtcEndDate: dayjs("2025-01-16T10:30:00.000Z").toDate(),
      releaseAt: dayjs().add(15, "minutes").toDate(), // Valid for 15 minutes
      isSeat: false,
    };

    // Mock prisma transaction behavior
    const mockTx = {
      selectedSlots: {
        findFirst: vi.fn().mockResolvedValue(validReservation),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      booking: {
        create: vi.fn().mockResolvedValue({
          id: 1,
          uid: "booking-123",
          status: BookingStatus.ACCEPTED,
        }),
        update: vi.fn(),
      },
      app_RoutingForms_FormResponse: {
        update: vi.fn(),
      },
    };

    // Mock prisma $transaction
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(mockTx);
    });

    const bookingData = {
      uid: "booking-123",
      eventTypeId: 1,
      userId: 101,
      startTime: dayjs("2025-01-16T10:00:00.000Z").toDate(),
      endTime: dayjs("2025-01-16T10:30:00.000Z").toDate(),
      status: BookingStatus.ACCEPTED,
      title: "Test Meeting",
      description: "",
      responses: {},
    };

    const result = await createBooking({
      newBookingData: bookingData,
      reservedSlotUid: "test-reservation-123",
    });

    // Verify reservation was found and validated
    expect(mockTx.selectedSlots.findFirst).toHaveBeenCalledWith({
      where: { uid: "test-reservation-123" },
    });

    // Verify reservation was consumed
    expect(mockTx.selectedSlots.deleteMany).toHaveBeenCalledWith({
      where: { uid: "test-reservation-123" },
    });

    // Verify booking was created
    expect(mockTx.booking.create).toHaveBeenCalled();
    expect(result.id).toBe(1);
  });

  test("should throw error when reservation not found", async () => {
    // Mock transaction with no reservation found
    const mockTx = {
      selectedSlots: {
        findFirst: vi.fn().mockResolvedValue(null), // No reservation found
        deleteMany: vi.fn(),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(mockTx);
    });

    const bookingData = {
      uid: "booking-123",
      eventTypeId: 1,
      userId: 101,
      startTime: dayjs("2025-01-16T10:00:00.000Z").toDate(),
      endTime: dayjs("2025-01-16T10:30:00.000Z").toDate(),
      status: BookingStatus.ACCEPTED,
      title: "Test Meeting",
      description: "",
      responses: {},
    };

    await expect(
      createBooking({
        newBookingData: bookingData,
        reservedSlotUid: "nonexistent-reservation",
      })
    ).rejects.toThrow(HttpError);

    // Should have tried to find the reservation
    expect(mockTx.selectedSlots.findFirst).toHaveBeenCalledWith({
      where: { uid: "nonexistent-reservation" },
    });
  });

  test("should throw error when reservation is expired", async () => {
    // Mock expired reservation
    const expiredReservation = {
      id: 1,
      uid: "expired-reservation-123",
      eventTypeId: 1,
      userId: 101,
      slotUtcStartDate: dayjs("2025-01-16T10:00:00.000Z").toDate(),
      slotUtcEndDate: dayjs("2025-01-16T10:30:00.000Z").toDate(),
      releaseAt: dayjs().subtract(5, "minutes").toDate(), // Expired 5 minutes ago
      isSeat: false,
    };

    const mockTx = {
      selectedSlots: {
        findFirst: vi.fn().mockResolvedValue(expiredReservation),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(mockTx);
    });

    const bookingData = {
      uid: "booking-123",
      eventTypeId: 1,
      userId: 101,
      startTime: dayjs("2025-01-16T10:00:00.000Z").toDate(),
      endTime: dayjs("2025-01-16T10:30:00.000Z").toDate(),
      status: BookingStatus.ACCEPTED,
      title: "Test Meeting",
      description: "",
      responses: {},
    };

    await expect(
      createBooking({
        newBookingData: bookingData,
        reservedSlotUid: "expired-reservation-123",
      })
    ).rejects.toThrow(HttpError);

    // Should clean up expired reservation
    expect(mockTx.selectedSlots.deleteMany).toHaveBeenCalledWith({
      where: { uid: "expired-reservation-123" },
    });
  });

  test("should work without reservation (backward compatibility)", async () => {
    const mockTx = {
      selectedSlots: {
        findFirst: vi.fn(),
        deleteMany: vi.fn(),
      },
      booking: {
        create: vi.fn().mockResolvedValue({
          id: 1,
          uid: "booking-123",
          status: BookingStatus.ACCEPTED,
        }),
        update: vi.fn(),
      },
      app_RoutingForms_FormResponse: {
        update: vi.fn(),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(mockTx);
    });

    const bookingData = {
      uid: "booking-123",
      eventTypeId: 1,
      userId: 101,
      startTime: dayjs("2025-01-16T10:00:00.000Z").toDate(),
      endTime: dayjs("2025-01-16T10:30:00.000Z").toDate(),
      status: BookingStatus.ACCEPTED,
      title: "Test Meeting",
      description: "",
      responses: {},
    };

    const result = await createBooking({
      newBookingData: bookingData,
      // No reservedSlotUid provided
    });

    // Should not interact with selectedSlots at all when no reservation is provided
    expect(mockTx.selectedSlots.findFirst).not.toHaveBeenCalled();
    
    // Should still create booking successfully
    expect(mockTx.booking.create).toHaveBeenCalled();
    expect(result.id).toBe(1);
  });
});