import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, it, beforeEach, vi } from "vitest";

import { deleteHandler } from "@calcom/trpc/server/routers/viewer/bookings/delete.handler";
import { deletePastBookingsHandler } from "@calcom/trpc/server/routers/viewer/bookings/deletePastBookings.handler";

describe("Booking deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete a single booking successfully", async () => {
    const mockBooking = {
      id: 1,
      userId: 123,
    };

    prismaMock.booking.findFirst.mockResolvedValue(mockBooking);
    prismaMock.booking.delete.mockResolvedValue(mockBooking);

    const ctx = {
      user: {
        id: 123,
      },
    };

    await deleteHandler({
      ctx,
      input: { id: 1 },
    });

    expect(prismaMock.booking.delete).toHaveBeenCalledTimes(1);
    expect(prismaMock.booking.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it("should delete multiple past bookings correctly", async () => {
    const mockBookings = [
      { id: 1, userId: 123 },
      { id: 2, userId: 123 },
    ];

    prismaMock.booking.findMany.mockResolvedValue(mockBookings);
    prismaMock.booking.deleteMany.mockResolvedValue({ count: 2 });

    const ctx = {
      user: {
        id: 123,
      },
    };

    await deletePastBookingsHandler({
      ctx,
      input: { ids: [1, 2] },
    });

    expect(prismaMock.booking.deleteMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.booking.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [{ userId: 123 }, { attendees: { some: { email: undefined } } }],
        endTime: { lt: expect.any(Date) },
        id: { in: undefined },
        status: { notIn: ["CANCELLED", "REJECTED"] },
      },
    });
  });

  it("should prevent deletion of unauthorized bookings", async () => {
    const mockBooking = {
      id: 1,
      userId: 456,
    };

    prismaMock.booking.findFirst.mockResolvedValue(mockBooking);

    const ctx = {
      user: {
        id: 123,
      },
    };

    await expect(
      deleteHandler({
        ctx,
        input: { id: 1 },
      })
    ).rejects.toThrow(/unauthorized/i);

    expect(prismaMock.booking.delete).not.toHaveBeenCalled();
  });

  it("should prevent deletion of unauthorized multiple bookings", async () => {
    const mockBooking = [
      { id: 1, userId: 456 },
      { id: 2, userId: 456 },
    ];

    prismaMock.booking.findMany.mockResolvedValue(mockBooking);
    prismaMock.booking.deleteMany.mockResolvedValue({ count: 0 });

    const ctx = {
      user: {
        id: 123,
      },
    };

    await expect(
      deletePastBookingsHandler({
        ctx,
        input: { id: [1, 2] },
      })
    ).rejects.toThrow(/unauthorized/i);

    expect(prismaMock.booking.deleteMany).not.toHaveBeenCalledTimes(1);
  });
});
