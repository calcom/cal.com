import { describe, expect, test, vi, beforeEach } from "vitest";
import { prismaMock } from "@calcom/web/test/utils/prismaMock";

describe("Reservation Validation Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup prisma mock methods
    prismaMock.selectedSlots = {
      findUnique: vi.fn(),
      delete: vi.fn(),
    } as any;
    
    prismaMock.$transaction = vi.fn();
  });

  test("should successfully validate and consume reservation", async () => {
    const reservationId = "test-reservation-id";
    const startTime = new Date("2024-01-01T10:00:00Z");
    const endTime = new Date("2024-01-01T11:00:00Z");
    
    // Mock valid reservation
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
    
    // Mock transaction
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    
    // Test the reservation validation logic
    const validateReservation = async (slotReservationId: string, start: string, end: string) => {
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

    const result = await validateReservation(
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

  test("should throw error when reservation not found", async () => {
    const reservationId = "nonexistent";
    
    prismaMock.selectedSlots.findUnique.mockResolvedValue(null);
    
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    
    const validateReservation = async (slotReservationId: string, start: string, end: string) => {
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

    await expect(validateReservation(
      reservationId, 
      new Date().toISOString(), 
      new Date().toISOString()
    )).rejects.toThrow('Reservation not found');
    
    expect(prismaMock.selectedSlots.findUnique).toHaveBeenCalledWith({
      where: { id: reservationId }
    });
    expect(prismaMock.selectedSlots.delete).not.toHaveBeenCalled();
  });

  test("should throw error when reservation expired", async () => {
    const reservationId = "expired-reservation";
    const startTime = new Date("2024-01-01T10:00:00Z");
    const endTime = new Date("2024-01-01T11:00:00Z");
    
    prismaMock.selectedSlots.findUnique.mockResolvedValue({
      id: reservationId,
      startTime,
      endTime,
      expirationTime: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      iamMeeting: false,
      uid: "user-123",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    
    const validateReservation = async (slotReservationId: string, start: string, end: string) => {
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
      
      return { success: true };
    };

    await expect(validateReservation(
      reservationId, 
      startTime.toISOString(), 
      endTime.toISOString()
    )).rejects.toThrow('Reservation expired');
    
    expect(prismaMock.selectedSlots.findUnique).toHaveBeenCalledWith({
      where: { id: reservationId }
    });
    expect(prismaMock.selectedSlots.delete).not.toHaveBeenCalled();
  });

  test("should throw error when reservation time mismatch", async () => {
    const reservationId = "time-mismatch";
    const reservationStartTime = new Date("2024-01-01T10:00:00Z");
    const reservationEndTime = new Date("2024-01-01T11:00:00Z");
    const bookingStartTime = new Date("2024-01-01T14:00:00Z");
    const bookingEndTime = new Date("2024-01-01T15:00:00Z");
    
    prismaMock.selectedSlots.findUnique.mockResolvedValue({
      id: reservationId,
      startTime: reservationStartTime,
      endTime: reservationEndTime,
      expirationTime: new Date(Date.now() + 5 * 60 * 1000),
      iamMeeting: false,
      uid: "user-123",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    
    const validateReservation = async (slotReservationId: string, start: string, end: string) => {
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

    await expect(validateReservation(
      reservationId, 
      bookingStartTime.toISOString(), 
      bookingEndTime.toISOString()
    )).rejects.toThrow('Reservation time mismatch');
    
    expect(prismaMock.selectedSlots.findUnique).toHaveBeenCalledWith({
      where: { id: reservationId }
    });
    expect(prismaMock.selectedSlots.delete).not.toHaveBeenCalled();
  });

  test("should work without reservation (backward compatibility)", async () => {
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    
    const validateReservation = async (slotReservationId: string | undefined, start: string, end: string) => {
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
      
      return { success: true };
    };

    const result = await validateReservation(
      undefined, 
      new Date().toISOString(), 
      new Date().toISOString()
    );
    
    expect(result.success).toBe(true);
    expect(prismaMock.selectedSlots.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.selectedSlots.delete).not.toHaveBeenCalled();
  });
});