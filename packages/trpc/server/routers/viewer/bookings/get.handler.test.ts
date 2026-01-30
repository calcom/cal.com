import getAllUserBookings from "@calcom/features/bookings/lib/getAllUserBookings";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import type { DB } from "@calcom/kysely";
import type { PrismaClient } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { Kysely } from "kysely";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBookings, getHandler } from "./get.handler";

vi.mock("@calcom/features/pbac/services/permission-check.service", () => ({
  PermissionCheckService: vi.fn(),
}));
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

  beforeEach(() => {
    vi.clearAllMocks();
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

    vi.mocked(getAllUserBookings).mockResolvedValue({
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
    expect(getAllUserBookings).toHaveBeenCalledWith(
      expect.objectContaining({
        ctx: expect.objectContaining({
          user: expect.objectContaining({
            id: mockUser.id,
            email: mockUser.email,
            orgId: null,
          }),
        }),
        filters: {},
        take: 10,
        skip: 0,
        bookingListingByStatus: ["upcoming"],
      })
    );
  });
});

describe("getBookings - PBAC Permission Checks", () => {
  const mockUser = {
    id: 1,
    email: "user@example.com",
    orgId: null,
  };

  const mockPrisma = {
    membership: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    eventType: {
      findMany: vi.fn(),
    },
    booking: {
      findUnique: vi.fn(),
      groupBy: vi.fn(),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  } as unknown as PrismaClient;

  // Create a comprehensive kysely mock that handles all chain methods
  const createMockKysely = () => {
    const mockQueryBuilder = {
      select: vi.fn((arg?: any) => {
        // Handle select with callback function
        if (typeof arg === "function") {
          return mockQueryBuilder;
        }
        return mockQueryBuilder;
      }),
      selectAll: vi.fn(() => mockQueryBuilder),
      where: vi.fn(() => mockQueryBuilder),
      innerJoin: vi.fn(() => mockQueryBuilder),
      union: vi.fn(() => mockQueryBuilder),
      as: vi.fn(() => mockQueryBuilder),
      $if: vi.fn(() => mockQueryBuilder),
      orderBy: vi.fn(() => mockQueryBuilder),
      limit: vi.fn(() => mockQueryBuilder),
      offset: vi.fn(() => mockQueryBuilder),
      compile: vi.fn(() => ({ sql: "SELECT * FROM bookings" })),
      executeTakeFirst: vi.fn().mockResolvedValue({ bookingCount: 0 }),
      execute: vi.fn().mockResolvedValue([]),
    };

    return {
      selectFrom: vi.fn(() => mockQueryBuilder),
      executeQuery: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as Kysely<DB>;
  };

  let mockKysely: Kysely<DB>;

  const mockGetTeamIdsWithPermission = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTeamIdsWithPermission.mockReset();
    vi.mocked(PermissionCheckService).mockImplementation(function () {
      return {
        getTeamIdsWithPermission: mockGetTeamIdsWithPermission,
      } as unknown as PermissionCheckService;
    });
    mockKysely = createMockKysely();
  });

  describe("PBAC permission checks with userIds filter", () => {
    it("should call PermissionCheckService with correct parameters", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([1]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([{ id: 2, email: "member@example.com" }]);
      mockPrisma.eventType.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

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

      expect(mockGetTeamIdsWithPermission).toHaveBeenCalledWith({
        userId: 1,
        permission: "booking.read",
        fallbackRoles: ["ADMIN", "OWNER"],
      });
    });

    it("should throw FORBIDDEN when user doesn't have booking.read permission for filtered userIds", async () => {
      // User has booking.read permission for team 1, but user 4 is not in that team
      mockGetTeamIdsWithPermission.mockResolvedValue([1]);
      // getUserIdsAndEmailsFromTeamIds returns only users from team 1 (ids 2, 3)
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([
        { id: 2, email: "member@example.com" },
        { id: 3, email: "member2@example.com" },
      ]);
      mockPrisma.eventType.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      const mockQueryBuilder = {
        select: vi.fn(() => mockQueryBuilder),
        where: vi.fn(() => mockQueryBuilder),
        innerJoin: vi.fn(() => mockQueryBuilder),
        union: vi.fn(() => mockQueryBuilder),
        as: vi.fn(() => ({
          select: vi.fn(() => ({
            selectAll: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(() => ({
                  offset: vi.fn(() => ({
                    compile: vi.fn(() => ({ sql: "SELECT * FROM bookings" })),
                  })),
                })),
              })),
            })),
            executeTakeFirst: vi.fn().mockResolvedValue({ bookingCount: 0 }),
          })),
        })),
      };

      mockKysely.selectFrom = vi.fn(() => mockQueryBuilder as any);
      mockKysely.executeQuery = vi.fn().mockResolvedValue({ rows: [] });

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely,
          bookingListingByStatus: ["upcoming"],
          filters: {
            userIds: [4], // User 4 is not in team 1
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
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      // When userIds filter is provided, getAttendeeEmailsFromUserIdsFilter is called
      // which looks up users by the userIds
      mockPrisma.user.findMany = vi.fn((args: any) => {
        // If looking up by userIds filter, return the user
        if (args?.where?.id?.in?.includes(1)) {
          return Promise.resolve([{ id: 1, email: "user@example.com" }]) as any;
        }
        // Otherwise return empty (for getUserIdsAndEmailsFromTeamIds)
        return Promise.resolve([]) as any;
      });
      mockPrisma.eventType.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      // User should always be able to access their own bookings
      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely,
          bookingListingByStatus: ["upcoming"],
          filters: {
            userIds: [1], // Own user ID
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should use fallback ADMIN/OWNER roles when PBAC is not enabled", async () => {
      // User is ADMIN in team 1 (fallback role)
      mockGetTeamIdsWithPermission.mockResolvedValue([1]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([{ id: 2, email: "member@example.com" }]);
      mockPrisma.eventType.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely,
          bookingListingByStatus: ["upcoming"],
          filters: {
            userIds: [2],
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();

      // Verify fallback roles are passed
      expect(mockGetTeamIdsWithPermission).toHaveBeenCalledWith({
        userId: 1,
        permission: "booking.read",
        fallbackRoles: ["ADMIN", "OWNER"],
      });
    });

    it("should combine PBAC permissions and ADMIN/OWNER roles", async () => {
      // User has booking.read permission for team 1 via PBAC
      // User is ADMIN in team 2 (fallback)
      mockGetTeamIdsWithPermission.mockResolvedValue([1, 2]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([
        { id: 2, email: "member-team1@example.com" },
        { id: 3, email: "member-team2@example.com" },
      ]);
      mockPrisma.eventType.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      // Should be able to access bookings from both teams
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

  describe("Event type filtering with subqueries", () => {
    it("should use subqueries for event types from teams where user has booking.read permission", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([1]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await getBookings({
        user: mockUser,
        prisma: mockPrisma,
        kysely: mockKysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 10,
        skip: 0,
      });

      // PERFORMANCE: With the optimization, we no longer call $queryRaw to fetch event type IDs.
      // Instead, we use subqueries directly in the SQL to avoid materializing large arrays.
      // The query is built using Kysely and executed via executeQuery.
      expect(mockKysely.executeQuery).toHaveBeenCalled();
    });
  });

  describe("User IDs retrieval for permission validation", () => {
    it("should only fetch user IDs when userIds filter is provided", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([1, 2]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([
        { id: 2, email: "user2@example.com" },
        { id: 3, email: "user3@example.com" },
      ]);
      mockPrisma.eventType.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await getBookings({
        user: mockUser,
        prisma: mockPrisma,
        kysely: mockKysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          userIds: [2], // When userIds filter is provided, we need to validate permissions
        },
        take: 10,
        skip: 0,
      });

      // Verify users are fetched from teams 1 and 2 for permission validation
      expect(mockPrisma.user.findMany).toHaveBeenCalled();
    });

    it("should NOT fetch user IDs when no userIds filter is provided (uses subqueries instead)", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([1, 2]);
      // Reset the mock to track calls
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.eventType.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await getBookings({
        user: mockUser,
        prisma: mockPrisma,
        kysely: mockKysely,
        bookingListingByStatus: ["upcoming"],
        filters: {}, // No userIds filter
        take: 10,
        skip: 0,
      });

      // PERFORMANCE: Without userIds filter, we don't need to fetch user IDs for validation.
      // The query uses subqueries instead of materializing all user IDs/emails.
      // user.findMany should NOT be called for getUserIdsFromTeamIds
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });
  });
});
