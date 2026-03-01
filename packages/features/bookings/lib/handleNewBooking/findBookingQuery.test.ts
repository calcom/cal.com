import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    booking: {
      findUnique: vi.fn(),
    },
  };
  return { default: mockPrisma };
});

vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: vi.fn((fn: (...args: never[]) => unknown) => fn),
}));

import prisma from "@calcom/prisma";
import { findBookingQuery } from "./findBookingQuery";

describe("findBookingQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns booking data when found", async () => {
    const mockBooking = {
      uid: "test-uid",
      location: "zoom",
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: new Date("2024-01-15T10:30:00Z"),
      title: "Meeting",
      description: "A meeting",
      status: "ACCEPTED",
      responses: {},
      metadata: {},
      user: {
        uuid: "u-1",
        name: "Host",
        email: "host@test.com",
        timeZone: "UTC",
        username: "host",
        isPlatformManaged: false,
      },
      eventType: {
        title: "30 Min",
        description: null,
        currency: "usd",
        length: 30,
        lockTimeZoneToggleOnBookingPage: false,
        requiresConfirmation: false,
        requiresBookerEmailVerification: false,
        price: 0,
      },
    };
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(mockBooking as never);

    const result = await findBookingQuery(1);
    expect(result).toEqual(mockBooking);
    expect(prisma.booking.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 } }));
  });

  it("throws when booking is not found", async () => {
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(null);

    await expect(findBookingQuery(999)).rejects.toThrow("Internal Error. Couldn't find booking");
  });

  it("uses select to avoid leaking sensitive data", async () => {
    vi.mocked(prisma.booking.findUnique).mockResolvedValue({ uid: "test" } as never);

    await findBookingQuery(1);
    const callArgs = vi.mocked(prisma.booking.findUnique).mock.calls[0][0];
    expect(callArgs).toHaveProperty("select");
    expect(callArgs.select).toHaveProperty("uid");
    expect(callArgs.select).toHaveProperty("status");
    expect(callArgs.select).not.toHaveProperty("include");
  });
});
