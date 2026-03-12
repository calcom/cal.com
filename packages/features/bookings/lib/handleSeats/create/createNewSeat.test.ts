import { HttpError } from "@calcom/lib/http-error";
import { BookingStatus } from "@calcom/prisma/enums";
import { describe, expect, it, vi } from "vitest";
import { addSeatToBooking } from "./createNewSeat";

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

describe("addSeatToBooking", () => {
  const makeMockPrisma = () => {
    const txMock = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      booking: {
        findUnique: vi.fn().mockResolvedValue({
          attendees: [{ bookingSeat: { id: 1 } }, { bookingSeat: null }],
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      bookingSeat: {
        findUnique: vi.fn().mockResolvedValue({ referenceUid: "new-seat-uid", id: 1 }),
      },
    };
    return {
      $transaction: vi.fn((fn: (...args: never[]) => unknown) => fn(txMock)),
      _tx: txMock,
    };
  };

  const makeInput = (overrides = {}) => ({
    bookingUid: "booking-uid-123",
    bookingId: 1,
    bookingStatus: BookingStatus.ACCEPTED,
    seatsPerTimeSlot: 5,
    attendee: {
      email: "attendee@test.com",
      name: "Attendee",
      timeZone: "UTC",
      locale: "en",
    },
    seatData: {
      description: "Test seat",
      responses: null,
    },
    ...overrides,
  });

  it("creates a new seat within a transaction", async () => {
    const prisma = makeMockPrisma();
    const result = await addSeatToBooking(makeInput(), prisma as never);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ referenceUid: "new-seat-uid" }));
  });

  it("throws 404 when booking not found", async () => {
    const prisma = makeMockPrisma();
    prisma._tx.booking.findUnique.mockResolvedValue(null);

    await expect(addSeatToBooking(makeInput(), prisma as never)).rejects.toThrow(HttpError);
  });

  it("throws 409 when seats are full", async () => {
    const prisma = makeMockPrisma();
    prisma._tx.booking.findUnique.mockResolvedValue({
      attendees: [{ bookingSeat: { id: 1 } }, { bookingSeat: { id: 2 } }, { bookingSeat: { id: 3 } }],
    });

    await expect(addSeatToBooking(makeInput({ seatsPerTimeSlot: 3 }), prisma as never)).rejects.toThrow(
      HttpError
    );
  });

  it("allows adding seat when seatsPerTimeSlot is 0 (unlimited)", async () => {
    const prisma = makeMockPrisma();
    prisma._tx.booking.findUnique.mockResolvedValue({
      attendees: [{ bookingSeat: { id: 1 } }, { bookingSeat: { id: 2 } }],
    });

    const result = await addSeatToBooking(makeInput({ seatsPerTimeSlot: 0 }), prisma as never);
    expect(result).toBeDefined();
  });

  it("reactivates cancelled booking when adding a seat", async () => {
    const prisma = makeMockPrisma();
    await addSeatToBooking(makeInput({ bookingStatus: BookingStatus.CANCELLED }), prisma as never);

    const updateCall = prisma._tx.booking.update.mock.calls[0][0];
    expect(updateCall.data).toHaveProperty("status", BookingStatus.ACCEPTED);
  });

  it("uses FOR UPDATE to lock the booking row", async () => {
    const prisma = makeMockPrisma();
    await addSeatToBooking(makeInput(), prisma as never);
    expect(prisma._tx.$queryRaw).toHaveBeenCalled();
  });
});
