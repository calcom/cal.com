import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, it, beforeEach, vi } from "vitest";

import { deleteBookingHandler } from "@calcom/trpc/server/routers/viewer/bookings/deleteBooking.handler";

describe("Booking deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete a single booking successfully", async () => {
    const mockBooking = {
      id: 1,
      userId: 123,
    };

    prismaMock.booking.delete.mockResolvedValue(mockBooking);

    const ctx = {
      user: {
        id: 123,
      },
    };

    await deleteBookingHandler({
      ctx,
      input: { id: 1 },
    });

    expect(prismaMock.booking.delete).toHaveBeenCalledTimes(1);
    expect(prismaMock.booking.delete).toHaveBeenCalledWith({
      where: { id: 1, userId: 123 },
    });
  });
});
