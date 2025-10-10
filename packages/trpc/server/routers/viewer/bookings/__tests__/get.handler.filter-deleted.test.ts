import { describe, it, expect, vi, beforeEach } from "vitest";

import type { PrismaClient } from "@calcom/prisma";

import { getBookings } from "../get.handler";

// Mock prisma minimal methods used inside getBookings
vi.mock("@calcom/prisma", () => {
  return {
    prisma: {
      membership: { findMany: vi.fn().mockResolvedValue([]) },
      booking: {
        groupBy: vi.fn().mockResolvedValue([]),
      },
    },
  };
});

describe("getBookings filters out deleted bookings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("applies where Booking.deleted = false and returns non-deleted rows", async () => {
    // Rows returned from selecting Booking (should not include deleted ones if filtering is correct)
    const nonDeletedRows = [
      {
        id: 1,
        title: "foo",
        startTime: new Date(),
        endTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        uid: "u1",
        paid: false,
      },
      {
        id: 2,
        title: "bar",
        startTime: new Date(),
        endTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        uid: "u2",
        paid: false,
      },
    ];

    // Chainable mocks for union subquery
    const selectAllUnionMock = vi.fn().mockReturnThis();
    const ifUnionMock = vi.fn().mockReturnThis();
    const orderByUnionMock = vi.fn().mockReturnThis();
    const limitUnionMock = vi.fn().mockReturnThis();
    const offsetUnionMock = vi.fn().mockReturnThis();
    const compileUnionMock = vi.fn().mockReturnValue({ sql: "compiled" });
    const executeQueryMock = vi.fn().mockResolvedValue({ rows: [{ id: 1 }, { id: 2 }] });

    // Chainable mocks for Booking select
    const whereBookingMock = vi.fn().mockReturnThis();
    const selectBookingMock = vi.fn().mockReturnThis();
    const orderByBookingMock = vi.fn().mockReturnThis();
    const executeBookingMock = vi.fn().mockResolvedValue(nonDeletedRows);

    const kysely = {
      selectFrom: vi.fn((table: unknown) => {
        if (table === "Booking") {
          return {
            where: whereBookingMock,
            select: selectBookingMock,
            orderBy: orderByBookingMock,
            execute: executeBookingMock,
          };
        }
        // union path
        return {
          selectAll: selectAllUnionMock,
          $if: ifUnionMock,
          orderBy: orderByUnionMock,
          limit: limitUnionMock,
          offset: offsetUnionMock,
          compile: compileUnionMock,
        };
      }),
      executeQuery: executeQueryMock,
    } as unknown as any;

    const { bookings } = await getBookings({
      user: { id: 1, email: "a@b.com" },
      prisma: (await import("@calcom/prisma")).prisma as unknown as PrismaClient,
      kysely,
      bookingListingByStatus: ["upcoming"],
      filters: {},
      take: 10,
      skip: 0,
    });

    // Ensure we got back the same rows
    expect(bookings.map((b: any) => b.id)).toEqual([1, 2]);

    // Ensure we applied deleted filter on Booking builder
    const calls = whereBookingMock.mock.calls.map((args) => args);
    expect(calls).toContainEqual(["Booking.deleted", "=", false]);
  });
});
