import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: (fn: (...args: never[]) => unknown) => fn,
}));

const mockFindUnique = vi.fn();
vi.mock("@calcom/prisma", () => ({
  default: {
    booking: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

import { findBookingQuery } from "./findBookingQuery";

describe("findBookingQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the booking when found", async () => {
    const mockBooking = {
      uid: "uid-123",
      location: "https://meet.example.com",
      startTime: new Date("2025-06-01T10:00:00Z"),
      endTime: new Date("2025-06-01T10:30:00Z"),
      title: "Test Booking",
      description: "A test",
      status: "ACCEPTED",
      responses: {},
      metadata: {},
      user: {
        uuid: "user-uuid",
        name: "Test User",
        email: "test@example.com",
        timeZone: "UTC",
        username: "testuser",
        isPlatformManaged: false,
      },
      eventType: {
        title: "30 Min Meeting",
        description: "Quick call",
        currency: "USD",
        length: 30,
        lockTimeZoneToggleOnBookingPage: false,
        requiresConfirmation: false,
        requiresBookerEmailVerification: false,
        price: 0,
      },
    };
    mockFindUnique.mockResolvedValue(mockBooking);

    const result = await findBookingQuery(1);

    expect(result).toEqual(mockBooking);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: expect.objectContaining({
        uid: true,
        location: true,
        startTime: true,
        endTime: true,
        title: true,
        description: true,
        status: true,
        responses: true,
        metadata: true,
        user: expect.objectContaining({
          select: expect.objectContaining({
            name: true,
            email: true,
          }),
        }),
        eventType: expect.objectContaining({
          select: expect.objectContaining({
            title: true,
            price: true,
          }),
        }),
      }),
    });
  });

  it("throws error when booking is not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(findBookingQuery(999)).rejects.toThrow("Internal Error. Couldn't find booking");
  });

  it("queries by booking id", async () => {
    mockFindUnique.mockResolvedValue({ uid: "test" });

    await findBookingQuery(42);

    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42 },
      })
    );
  });
});
