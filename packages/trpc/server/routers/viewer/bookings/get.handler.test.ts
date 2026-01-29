import { getGetBookingsRepository } from "@calcom/features/bookings/di/GetBookingsRepository.container";
import getAllUserBookings from "@calcom/features/bookings/lib/getAllUserBookings";
import type { DB } from "@calcom/kysely";
import type { PrismaClient } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { Kysely } from "kysely";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBookings, getHandler } from "./get.handler";

vi.mock("@calcom/features/bookings/di/GetBookingsRepository.container");
vi.mock("@calcom/features/bookings/lib/getAllUserBookings");
vi.mock("@calcom/kysely", () => ({
  default: {
    selectFrom: vi.fn(),
    executeQuery: vi.fn(),
  },
}));
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe("getHandler", () => {
  const mockUser = {
    id: 1,
    email: "user@example.com",
    name: "Test User",
    profile: {
      organizationId: null,
    },
  };

  const mockPrisma = {} as unknown as PrismaClient;

  const mockFindManyForWeb = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getGetBookingsRepository).mockReturnValue({
      findManyForWeb: mockFindManyForWeb,
      findManyForApiV2: vi.fn(),
    } as any);
  });

  it("should return bookings successfully", async () => {
    const mockBookings = [
      {
        id: 1,
        uid: "booking-1",
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        rescheduler: null,
        eventType: {
          recurringEvent: null,
          eventTypeColor: null,
          price: 0,
          currency: "usd",
          metadata: {},
        },
      },
    ] as any;

    mockFindManyForWeb.mockResolvedValue({
      bookings: mockBookings,
      recurringInfo: [],
      totalCount: 1,
    });

    const result = await getHandler({
      ctx: {
        user: mockUser as any,
        prisma: mockPrisma,
      },
      input: {
        filters: {},
        limit: 10,
        offset: 0,
      },
    });

    expect(result.bookings).toEqual(mockBookings);
    expect(result.totalCount).toBe(1);
    expect(mockFindManyForWeb).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          orgId: null,
        }),
        filters: expect.objectContaining({
          statuses: ["upcoming"],
        }),
        take: 10,
        skip: 0,
        bookingListingByStatus: ["upcoming"],
      })
    );
  });
});

describe("getBookings - Repository Integration", () => {
  const mockUser = {
    id: 1,
    email: "user@example.com",
    orgId: null,
  };

  const mockPrisma = {} as unknown as PrismaClient;

  const createMockKysely = () => {
    return {} as unknown as Kysely<DB>;
  };

  let mockKysely: Kysely<DB>;
  const mockFindManyForApiV2 = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockKysely = createMockKysely();
    vi.mocked(getGetBookingsRepository).mockReturnValue({
      findManyForWeb: vi.fn(),
      findManyForApiV2: mockFindManyForApiV2,
    } as any);
  });

  describe("PBAC permission checks with userIds filter", () => {
    it("should delegate to repository with correct parameters", async () => {
      mockFindManyForApiV2.mockResolvedValue({
        bookings: [],
        recurringInfo: [],
        totalCount: 0,
      });

      await getBookings({
        user: mockUser,
        prisma: mockPrisma,
        kysely: mockKysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          userIds: [2],
        },
        take: 10,
        skip: 0,
      });

      expect(mockFindManyForApiV2).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          bookingListingByStatus: ["upcoming"],
          filters: { userIds: [2] },
          take: 10,
          skip: 0,
        })
      );
    });

    it("should throw FORBIDDEN when repository throws FORBIDDEN error", async () => {
      mockFindManyForApiV2.mockRejectedValue(
        new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permissions to fetch bookings for specified userIds",
        })
      );

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely,
          bookingListingByStatus: ["upcoming"],
          filters: {
            userIds: [4],
          },
          take: 10,
          skip: 0,
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You do not have permissions to fetch bookings for specified userIds",
      });
    });

    it("should allow access when filtering by own userId", async () => {
      mockFindManyForApiV2.mockResolvedValue({
        bookings: [],
        recurringInfo: [],
        totalCount: 0,
      });

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely,
          bookingListingByStatus: ["upcoming"],
          filters: {
            userIds: [1],
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should pass filters correctly to repository", async () => {
      mockFindManyForApiV2.mockResolvedValue({
        bookings: [],
        recurringInfo: [],
        totalCount: 0,
      });

      await getBookings({
        user: mockUser,
        prisma: mockPrisma,
        kysely: mockKysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          userIds: [2],
        },
        take: 10,
        skip: 0,
      });

      expect(mockFindManyForApiV2).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { userIds: [2] },
        })
      );
    });

    it("should handle multiple userIds in filter", async () => {
      mockFindManyForApiV2.mockResolvedValue({
        bookings: [],
        recurringInfo: [],
        totalCount: 0,
      });

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely,
          bookingListingByStatus: ["upcoming"],
          filters: {
            userIds: [2, 3],
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });
  });

  describe("Event type filtering", () => {
    it("should pass event type filters to repository", async () => {
      mockFindManyForApiV2.mockResolvedValue({
        bookings: [],
        recurringInfo: [],
        totalCount: 0,
      });

      await getBookings({
        user: mockUser,
        prisma: mockPrisma,
        kysely: mockKysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          eventTypeIds: [1, 2],
        },
        take: 10,
        skip: 0,
      });

      expect(mockFindManyForApiV2).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { eventTypeIds: [1, 2] },
        })
      );
    });
  });

  describe("Pagination", () => {
    it("should pass pagination parameters to repository", async () => {
      mockFindManyForApiV2.mockResolvedValue({
        bookings: [],
        recurringInfo: [],
        totalCount: 0,
      });

      await getBookings({
        user: mockUser,
        prisma: mockPrisma,
        kysely: mockKysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 20,
        skip: 10,
      });

      expect(mockFindManyForApiV2).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 10,
        })
      );
    });
  });
});
