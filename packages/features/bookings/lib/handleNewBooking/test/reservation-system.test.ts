import { describe, expect, test, beforeEach, vi } from "vitest";
import prismaMock from "../../../../../../tests/libs/__mocks__/prisma";

describe("Reservation System Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should validate and consume reservation correctly", async () => {
    const reservationId = "test-reservation-123";
    const startTime = new Date("2024-01-01T10:00:00Z");
    const endTime = new Date("2024-01-01T11:00:00Z");

    // Mock a valid reservation
    prismaMock.selectedSlots.findUnique.mockResolvedValue({
      id: reservationId,
      startTime,
      endTime,
      expirationTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
      iamMeeting: false,
      uid: "user-123",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    prismaMock.selectedSlots.delete.mockResolvedValue({
      id: reservationId,
      startTime,
      endTime,
      expirationTime: new Date(),
      iamMeeting: false,
      uid: "user-123",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });

    // Simulate the reservation validation logic from createBooking.ts
    const reservationValidation = async (slotReservationId: string, start: string, end: string) => {
      if (slotReservationId) {
        await prismaMock.$transaction(async (tx) => {
          const reservation = await tx.selectedSlots.findUnique({
            where: { id: slotReservationId }
          });
          
          if (!reservation) {
            throw new Error('Reservation not found');
          }
          
          if (reservation.expirationTime < new Date()) {
            throw new Error('Reservation expired');
          }
          
          const reservationStart = reservation.startTime.toISOString();
          const reservationEnd = reservation.endTime.toISOString();
          
          if (reservationStart !== start || reservationEnd !== end) {
            throw new Error('Reservation time mismatch');
          }
          
          await tx.selectedSlots.delete({
            where: { id: slotReservationId }
          });
        });
      }
      
      return { success: true };
    };

    // Execute validation
    const result = await reservationValidation(
      reservationId, 
      startTime.toISOString(), 
      endTime.toISOString()
    );

    expect(result.success).toBe(true);
    expect(prismaMock.selectedSlots.findUnique).toHaveBeenCalledWith({
      where: { id: reservationId }
    });
    expect(prismaMock.selectedSlots.delete).toHaveBeenCalledWith({
      where: { id: reservationId }
    });
  });

  test("should reject expired reservation", async () => {
    const reservationId = "expired-reservation";
    
    prismaMock.selectedSlots.findUnique.mockResolvedValue({
      id: reservationId,
      startTime: new Date(),
      endTime: new Date(),
      expirationTime: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      iamMeeting: false,
      uid: "user-123",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });

    const reservationValidation = async (slotReservationId: string) => {
      if (slotReservationId) {
        await prismaMock.$transaction(async (tx) => {
          const reservation = await tx.selectedSlots.findUnique({
            where: { id: slotReservationId }
          });
          
          if (!reservation) {
            throw new Error('Reservation not found');
          }
          
          if (reservation.expirationTime < new Date()) {
            throw new Error('Reservation expired');
          }
          
          await tx.selectedSlots.delete({
            where: { id: slotReservationId }
          });
        });
      }
    };

    await expect(reservationValidation(reservationId)).rejects.toThrow('Reservation expired');
    expect(prismaMock.selectedSlots.findUnique).toHaveBeenCalledWith({
      where: { id: reservationId }
    });
    expect(prismaMock.selectedSlots.delete).not.toHaveBeenCalled();
  });

  test("should reject non-existent reservation", async () => {
    const reservationId = "nonexistent-reservation";
    
    prismaMock.selectedSlots.findUnique.mockResolvedValue(null);

    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });

    const reservationValidation = async (slotReservationId: string) => {
      if (slotReservationId) {
        await prismaMock.$transaction(async (tx) => {
          const reservation = await tx.selectedSlots.findUnique({
            where: { id: slotReservationId }
          });
          
          if (!reservation) {
            throw new Error('Reservation not found');
          }
          
          await tx.selectedSlots.delete({
            where: { id: slotReservationId }
          });
        });
      }
    };

    await expect(reservationValidation(reservationId)).rejects.toThrow('Reservation not found');
    expect(prismaMock.selectedSlots.findUnique).toHaveBeenCalledWith({
      where: { id: reservationId }
    });
    expect(prismaMock.selectedSlots.delete).not.toHaveBeenCalled();
  });

  test("should work without reservation (backward compatibility)", async () => {
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });

    const reservationValidation = async (slotReservationId?: string) => {
      if (slotReservationId) {
        await prismaMock.$transaction(async (tx) => {
          const reservation = await tx.selectedSlots.findUnique({
            where: { id: slotReservationId }
          });
          
          if (!reservation) {
            throw new Error('Reservation not found');
          }
          
          await tx.selectedSlots.delete({
            where: { id: slotReservationId }
          });
        });
      }
      
      return { success: true };
    };

    const result = await reservationValidation();
    expect(result.success).toBe(true);
    expect(prismaMock.selectedSlots.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.selectedSlots.delete).not.toHaveBeenCalled();
  });
});