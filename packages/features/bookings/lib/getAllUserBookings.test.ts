import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/trpc/server/routers/viewer/bookings/get.handler", () => ({
  getBookings: vi.fn().mockResolvedValue({
    bookings: [{ id: 1, title: "Test Booking" }],
    recurringInfo: [],
    totalCount: 1,
  }),
}));

// biome-ignore lint/style/noRestrictedImports: test needs to verify mock of pre-existing trpc import
import { getBookings } from "@calcom/trpc/server/routers/viewer/bookings/get.handler";
import getAllUserBookings from "./getAllUserBookings";

describe("getAllUserBookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns bookings, recurringInfo and totalCount", async () => {
    const result = await getAllUserBookings({
      ctx: {
        user: { id: 1, email: "user@test.com" },
        prisma: {} as never,
        kysely: {} as never,
      },
      bookingListingByStatus: ["upcoming"],
      take: 10,
      skip: 0,
      filters: {},
      sort: undefined,
    });

    expect(result).toHaveProperty("bookings");
    expect(result).toHaveProperty("recurringInfo");
    expect(result).toHaveProperty("totalCount");
    expect(result.totalCount).toBe(1);
  });

  it("passes statuses filter from filters.statuses", async () => {
    await getAllUserBookings({
      ctx: {
        user: { id: 1, email: "user@test.com" },
        prisma: {} as never,
        kysely: {} as never,
      },
      bookingListingByStatus: ["upcoming"],
      take: 10,
      skip: 0,
      filters: { statuses: ["past", "cancelled"] },
    });

    expect(getBookings).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          statuses: ["past", "cancelled"],
        }),
      })
    );
  });

  it("falls back to singular status when statuses not provided", async () => {
    await getAllUserBookings({
      ctx: {
        user: { id: 1, email: "user@test.com" },
        prisma: {} as never,
        kysely: {} as never,
      },
      bookingListingByStatus: ["upcoming"],
      take: 10,
      skip: 0,
      filters: { status: "past" },
    });

    expect(getBookings).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          statuses: ["past"],
        }),
      })
    );
  });

  it("falls back to bookingListingByStatus when no status filters", async () => {
    await getAllUserBookings({
      ctx: {
        user: { id: 1, email: "user@test.com" },
        prisma: {} as never,
        kysely: {} as never,
      },
      bookingListingByStatus: ["upcoming", "recurring"],
      take: 10,
      skip: 0,
      filters: {},
    });

    expect(getBookings).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          statuses: ["upcoming", "recurring"],
        }),
      })
    );
  });
});
