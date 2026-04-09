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
    $queryRawUnsafe: vi
      .fn()
      .mockResolvedValue([{ "QUERY PLAN": [{ Plan: { Plans: [{ "Plan Rows": 0 }] } }] }]),
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
      unionAll: vi.fn(() => mockQueryBuilder),
      distinct: vi.fn(() => mockQueryBuilder),
      as: vi.fn(() => mockQueryBuilder),
      $if: vi.fn(() => mockQueryBuilder),
      orderBy: vi.fn(() => mockQueryBuilder),
      limit: vi.fn(() => mockQueryBuilder),
      offset: vi.fn(() => mockQueryBuilder),
      compile: vi.fn(() => ({ sql: "SELECT * FROM bookings", parameters: [] })),
      executeTakeFirst: vi.fn().mockResolvedValue({ bookingCount: 0 }),
      execute: vi.fn().mockResolvedValue([]),
    };

    const mockKyselyObj: any = {
      selectFrom: vi.fn(() => mockQueryBuilder),
      executeQuery: vi.fn().mockResolvedValue({ rows: [] }),
      _mockQueryBuilder: mockQueryBuilder,
    };
    // .with() chains arbitrarily and ends with .selectFrom()
    mockKyselyObj.with = vi.fn(() => mockKyselyObj);
    return mockKyselyObj as unknown as Kysely<DB> & { _mockQueryBuilder: typeof mockQueryBuilder };
  };

  let mockKysely: ReturnType<typeof createMockKysely>;

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
        kysely: mockKysely as unknown as Kysely<DB>,
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
        unionAll: vi.fn(() => mockQueryBuilder),
        as: vi.fn(() => ({
          select: vi.fn(() => ({
            selectAll: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(() => ({
                  offset: vi.fn(() => ({
                    compile: vi.fn(() => ({ sql: "SELECT * FROM bookings", parameters: [] })),
                  })),
                })),
              })),
            })),
            executeTakeFirst: vi.fn().mockResolvedValue({ bookingCount: 0 }),
          })),
        })),
      };

      (mockKysely as any).selectFrom = vi.fn(() => mockQueryBuilder as any);
      (mockKysely as any).executeQuery = vi.fn().mockResolvedValue({ rows: [] });

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
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
          kysely: mockKysely as unknown as Kysely<DB>,
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
          kysely: mockKysely as unknown as Kysely<DB>,
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
          kysely: mockKysely as unknown as Kysely<DB>,
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
        kysely: mockKysely as unknown as Kysely<DB>,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 10,
        skip: 0,
      });

      // PERFORMANCE: With the CTE optimization, team access queries use .with() CTEs
      // and execute directly via the query builder, not via kysely.executeQuery().
      expect((mockKysely as any).with).toHaveBeenCalled();
      expect(mockKysely._mockQueryBuilder.execute).toHaveBeenCalled();
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
        kysely: mockKysely as unknown as Kysely<DB>,
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
        kysely: mockKysely as unknown as Kysely<DB>,
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

  describe("UNION ALL with DISTINCT query optimization", () => {
    it("should use CTE + OR for team access queries instead of UNION ALL", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([1]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await getBookings({
        user: mockUser,
        prisma: mockPrisma,
        kysely: mockKysely as unknown as Kysely<DB>,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 10,
        skip: 0,
      });

      // Team access path uses CTEs (.with()) instead of UNION ALL
      expect((mockKysely as any).with).toHaveBeenCalled();
    });

    it("should use UNION ALL + DISTINCT for non-team personal bookings", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await getBookings({
        user: mockUser,
        prisma: mockPrisma,
        kysely: mockKysely as unknown as Kysely<DB>,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 10,
        skip: 0,
      });

      // Personal bookings path uses UNION ALL + DISTINCT
      expect(mockKysely._mockQueryBuilder.unionAll).toHaveBeenCalled();
      expect(mockKysely._mockQueryBuilder.distinct).toHaveBeenCalled();
    });

    it("should use count with distinct for totalCount calculation when no team access", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      // Page must be full so the COUNT query runs (not short-circuited)
      (mockKysely as any).executeQuery = vi.fn().mockResolvedValue({
        rows: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 })),
      });

      await getBookings({
        user: mockUser,
        prisma: mockPrisma,
        kysely: mockKysely as unknown as Kysely<DB>,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 10,
        skip: 0,
      });

      // The count query uses fn.count("union_subquery.id").distinct()
      // instead of fn.countAll() to ensure duplicates from UNION ALL
      // are not counted multiple times
      expect(mockKysely._mockQueryBuilder.executeTakeFirst).toHaveBeenCalled();
    });

    it("should skip COUNT when results don't fill the page", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([1]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      // 0 rows returned < take of 10, so count is derived without a query (skip + rows = 0)
      const result = await getBookings({
        user: mockUser,
        prisma: mockPrisma,
        kysely: mockKysely as unknown as Kysely<DB>,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 10,
        skip: 0,
      });

      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
      // $queryRawUnsafe should NOT have been called (no EXPLAIN needed)
      expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });

    it("should return hasMore signal instead of count for team access with full page", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([1]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      // Page is full (10 rows = take)
      // CTE path fetches take+1 to detect hasMore, so return 11 rows
      const mockRows = Array.from({ length: 11 }, (_, i) => ({ id: i + 1 }));
      const mockPlainBookings = mockRows.slice(0, 10).map((r) => ({
        ...r,
        seatsReferences: [],
        attendees: [],
        eventType: null,
        user: null,
        references: [],
        payment: [],
        startTime: new Date(),
        endTime: new Date(),
      }));
      mockKysely._mockQueryBuilder.execute = vi
        .fn()
        .mockResolvedValueOnce(mockRows)
        .mockResolvedValueOnce(mockPlainBookings);

      const result = await getBookings({
        user: mockUser,
        prisma: mockPrisma,
        kysely: mockKysely as unknown as Kysely<DB>,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 10,
        skip: 0,
      });

      // Team CTE path skips count — returns null totalCount with hasMore
      expect(result.totalCount).toBeNull();
      expect(result.hasMore).toBe(true);
      // No EXPLAIN or count query should have been called
      expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });
  });

  describe("App-level event type scope filtering", () => {
    it("should return fewer bookings than SQL fetched but keep totalCount unchanged", async () => {
      // User has access to team 1 only
      mockGetTeamIdsWithPermission.mockResolvedValue([1]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      // SQL returns 5 rows (page not full → totalCount = skip + rows = 5)
      // But 2 bookings belong to team 99 (not accessible) and are not
      // organizer/attendee matches — the app-level filter should remove them.
      const mockRows = [
        { id: 1 },
        { id: 2 },
        { id: 3 }, // team 99 — filtered out
        { id: 4 },
        { id: 5 }, // team 99 — filtered out
      ];
      const mockPlainBookings = mockRows.map((r) => ({
        ...r,
        seatsReferences: [],
        attendees: [],
        // Bookings 3 and 5 belong to team 99 (no access)
        eventType: r.id === 3 || r.id === 5 ? { teamId: 99 } : { teamId: 1 },
        user: { id: 999 }, // Not the current user (id=1)
        references: [],
        payment: [],
        startTime: new Date(),
        endTime: new Date(),
      }));

      mockKysely._mockQueryBuilder.execute = vi
        .fn()
        .mockResolvedValueOnce(mockRows) // bookingsFromUnion (ID-only query)
        .mockResolvedValueOnce(mockPlainBookings); // plainBookings (full data)

      const result = await getBookings({
        user: mockUser,
        prisma: mockPrisma,
        kysely: mockKysely as unknown as Kysely<DB>,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 10,
        skip: 0,
      });

      // SQL returned 5 rows → totalCount stays at 5 (the SQL-derived count)
      // App-level filter removed 2 → only 3 bookings are returned on this page
      // The UI will show e.g. "1-3 of 5" — the page has fewer rows but the
      // overall count remains accurate to the database.
      expect(result.bookings.length).toBe(3);
      expect(result.totalCount).toBe(5);
    });
  });
});
