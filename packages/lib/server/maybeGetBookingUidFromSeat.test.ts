import { describe, expect, it, vi } from "vitest";
import { maybeGetBookingUidFromSeat } from "./maybeGetBookingUidFromSeat";

function createMockPrisma(seatResult: unknown) {
  return {
    bookingSeat: {
      findUnique: vi.fn().mockResolvedValue(seatResult),
    },
  };
}

describe("maybeGetBookingUidFromSeat", () => {
  it("returns original uid when no seat is found", async () => {
    const prisma = createMockPrisma(null);
    const result = await maybeGetBookingUidFromSeat(
      prisma as unknown as Parameters<typeof maybeGetBookingUidFromSeat>[0],
      "booking-uid-123"
    );
    expect(result).toEqual({ uid: "booking-uid-123" });
  });

  it("queries bookingSeat by referenceUid", async () => {
    const prisma = createMockPrisma(null);
    await maybeGetBookingUidFromSeat(
      prisma as unknown as Parameters<typeof maybeGetBookingUidFromSeat>[0],
      "seat-ref-456"
    );
    expect(prisma.bookingSeat.findUnique).toHaveBeenCalledWith({
      where: { referenceUid: "seat-ref-456" },
      select: {
        booking: { select: { id: true, uid: true } },
        data: true,
      },
    });
  });

  it("returns booking uid and seatReferenceUid when seat is found", async () => {
    const seatResult = {
      booking: { id: 42, uid: "actual-booking-uid" },
      data: { some: "data" },
    };
    const prisma = createMockPrisma(seatResult);
    const result = await maybeGetBookingUidFromSeat(
      prisma as unknown as Parameters<typeof maybeGetBookingUidFromSeat>[0],
      "seat-ref-789"
    );
    expect(result).toEqual({
      uid: "actual-booking-uid",
      seatReferenceUid: "seat-ref-789",
      bookingSeat: seatResult,
    });
  });

  it("includes full bookingSeat object in result when found", async () => {
    const seatResult = {
      booking: { id: 1, uid: "b-uid" },
      data: null,
    };
    const prisma = createMockPrisma(seatResult);
    const result = await maybeGetBookingUidFromSeat(
      prisma as unknown as Parameters<typeof maybeGetBookingUidFromSeat>[0],
      "ref-1"
    );
    expect(result.bookingSeat).toBe(seatResult);
  });

  it("does not include seatReferenceUid or bookingSeat when not found", async () => {
    const prisma = createMockPrisma(null);
    const result = await maybeGetBookingUidFromSeat(
      prisma as unknown as Parameters<typeof maybeGetBookingUidFromSeat>[0],
      "missing"
    );
    expect(result).not.toHaveProperty("seatReferenceUid");
    expect(result).not.toHaveProperty("bookingSeat");
  });
});
