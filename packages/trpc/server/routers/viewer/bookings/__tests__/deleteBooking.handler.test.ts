import prismaMock from "../../../../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, it, beforeEach, vi } from "vitest";

import { deleteBookingHandler } from "@calcom/trpc/server/routers/viewer/bookings/deleteBooking.handler";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

describe("Booking deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const ctx = {
    user: {
      id: 123,
      name: "test",
      timeZone: "timeZone",
      username: "test_username",
    } as NonNullable<TrpcSessionUser>,
  };

  it("should delete a single booking successfully", async () => {
    const mockBooking: any = { id: 1, userId: 123 };

    // Set the spy to resolve with your mock data
    prismaMock.booking.delete.mockResolvedValueOnce(mockBooking);

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
