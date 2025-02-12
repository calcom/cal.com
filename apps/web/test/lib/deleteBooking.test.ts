import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, it, beforeEach, vi } from "vitest";

import type { Booking } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/client";
import { BookerLayouts } from "@calcom/prisma/zod-utils";
import { deleteHandler } from "@calcom/trpc/server/routers/viewer/bookings/delete.handler";
import { deletePastBookingsHandler } from "@calcom/trpc/server/routers/viewer/bookings/deletePastBookings.handler";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

describe("Booking deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete a single booking successfully", async () => {
    const mockBooking = {
      id: 1,
      status: BookingStatus.ACCEPTED,
      userId: 123,
      uid: "test-uid",
    } as Booking;

    prismaMock.booking.findFirst.mockResolvedValue(mockBooking);
    prismaMock.booking.delete.mockResolvedValue(mockBooking);

    const mockCtx = {
      user: {
        id: 123,
        email: "test@example.com",
        username: "testuser",
        name: "Test User",
        avatar: "avatar.png",
        organization: {
          id: null,
          isOrgAdmin: false,
          metadata: null,
          requestedSlug: null,
        },
        organizationId: null,
        locale: "en",
        defaultBookerLayouts: {
          enabledLayouts: [BookerLayouts.MONTH_VIEW],
          defaultLayout: BookerLayouts.MONTH_VIEW,
        },
        timeZone: "UTC",
        weekStart: "Monday",
        startTime: 0,
        endTime: 1440,
        bufferTime: 0,
        destinationCalendar: null,
      } as NonNullable<TrpcSessionUser>,
    };

    await deleteHandler({
      ctx: mockCtx,
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

    const mockCtx = {
      user: {
        id: 123,
        email: "test@example.com",
        username: "testuser",
        name: "Test User",
        avatar: "avatar.png",
        organization: {
          id: null,
          isOrgAdmin: false,
          metadata: null,
          requestedSlug: null,
        },
        organizationId: null,
        locale: "en",
        defaultBookerLayouts: {
          enabledLayouts: [BookerLayouts.MONTH_VIEW],
          defaultLayout: BookerLayouts.MONTH_VIEW,
        },
        timeZone: "UTC",
        weekStart: "Monday",
        startTime: 0,
        endTime: 1440,
        bufferTime: 0,
        destinationCalendar: null,
      } as NonNullable<TrpcSessionUser>,
    };

    await deletePastBookingsHandler({
      ctx: mockCtx,
      input: { bookingIds: [1, 2] },
    });

    expect(prismaMock.booking.deleteMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.booking.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [{ userId: 123 }, { attendees: { some: { email: "test@example.com" } } }],
        endTime: { lt: expect.any(Date) },
        id: { in: [1, 2] },
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

    const mockCtx = {
      user: {
        id: 123,
        email: "test@example.com",
        username: "testuser",
        name: "Test User",
        avatar: "avatar.png",
        organization: {
          id: null,
          isOrgAdmin: false,
          metadata: null,
          requestedSlug: null,
        },
        organizationId: null,
        locale: "en",
        defaultBookerLayouts: {
          enabledLayouts: [BookerLayouts.MONTH_VIEW],
          defaultLayout: BookerLayouts.MONTH_VIEW,
        },
        timeZone: "UTC",
        weekStart: "Monday",
        startTime: 0,
        endTime: 1440,
        bufferTime: 0,
        destinationCalendar: null,
      } as NonNullable<TrpcSessionUser>,
    };

    await expect(
      deleteHandler({
        ctx: mockCtx,
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

    const mockCtx = {
      user: {
        id: 123,
        email: "test@example.com",
        username: "testuser",
        name: "Test User",
        avatar: "avatar.png",
        organization: {
          id: null,
          isOrgAdmin: false,
          metadata: null,
          requestedSlug: null,
        },
        organizationId: null,
        locale: "en",
        defaultBookerLayouts: {
          enabledLayouts: [BookerLayouts.MONTH_VIEW],
          defaultLayout: BookerLayouts.MONTH_VIEW,
        },
        timeZone: "UTC",
        weekStart: "Monday",
        startTime: 0,
        endTime: 1440,
        bufferTime: 0,
        destinationCalendar: null,
      } as NonNullable<TrpcSessionUser>,
    };

    await expect(
      deletePastBookingsHandler({
        ctx: mockCtx,
        input: { bookingIds: [1, 2] },
      })
    ).rejects.toThrow(/unauthorized/i);

    expect(prismaMock.booking.deleteMany).not.toHaveBeenCalledTimes(1);
  });
});
