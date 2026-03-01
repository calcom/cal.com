import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindUnique = vi.fn();
vi.mock("@calcom/prisma", () => ({
  default: {
    bookingSeat: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

import { getSeatedBooking } from "./getSeatedBooking";

describe("getSeatedBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns booking seat with booking and attendee when found", async () => {
    const mockSeat = {
      id: 1,
      referenceUid: "seat-uid-123",
      booking: {
        id: 10,
        uid: "booking-uid",
        startTime: new Date("2025-06-01T10:00:00Z"),
      },
      attendee: {
        id: 20,
        name: "John Doe",
        email: "john@example.com",
      },
    };
    mockFindUnique.mockResolvedValue(mockSeat);

    const result = await getSeatedBooking("seat-uid-123");

    expect(result).toEqual(mockSeat);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { referenceUid: "seat-uid-123" },
      include: { booking: true, attendee: true },
    });
  });

  it("returns null when booking seat is not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await getSeatedBooking("nonexistent-uid");

    expect(result).toBeNull();
  });

  it("queries by referenceUid", async () => {
    mockFindUnique.mockResolvedValue(null);

    await getSeatedBooking("test-ref-uid");

    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { referenceUid: "test-ref-uid" },
      })
    );
  });

  it("always includes booking and attendee relations", async () => {
    mockFindUnique.mockResolvedValue(null);

    await getSeatedBooking("any-uid");

    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { booking: true, attendee: true },
      })
    );
  });
});
