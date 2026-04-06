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

  it("should use cursor as offset when provided", async () => {
    vi.mocked(getAllUserBookings).mockResolvedValue({
      bookings: [],
      recurringInfo: [],
      totalCount: 0,
    });

    await getHandler({
      ctx: { user: mockUser as any, prisma: mockPrisma },
      input: { filters: {}, limit: 10, offset: 0, cursor: "20" },
    });

    expect(getAllUserBookings).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20 })
    );
  });

  it("should ignore invalid cursor values and use offset", async () => {
    vi.mocked(getAllUserBookings).mockResolvedValue({
      bookings: [],
      recurringInfo: [],
      totalCount: 0,
    });

    await getHandler({
      ctx: { user: mockUser as any, prisma: mockPrisma },
      input: { filters: {}, limit: 10, offset: 5, cursor: "invalid" },
    });

    expect(getAllUserBookings).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5 })
    );
  });

  it("should ignore negative cursor values", async () => {
    vi.mocked(getAllUserBookings).mockResolvedValue({
      bookings: [],
      recurringInfo: [],
      totalCount: 0,
    });

    await getHandler({
      ctx: { user: mockUser as any, prisma: mockPrisma },
      input: { filters: {}, limit: 10, offset: 5, cursor: "-1" },
    });

    expect(getAllUserBookings).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5 })
    );
  });

  it("should return nextCursor when there are more results", async () => {
    vi.mocked(getAllUserBookings).mockResolvedValue({
      bookings: [],
      recurringInfo: [],
      totalCount: 50,
    });

    const result = await getHandler({
      ctx: { user: mockUser as any, prisma: mockPrisma },
      input: { filters: {}, limit: 10, offset: 0 },
    });

    expect(result.nextCursor).toBe("10");
  });

  it("should not return nextCursor when at the end of results", async () => {
    vi.mocked(getAllUserBookings).mockResolvedValue({
      bookings: [],
      recurringInfo: [],
      totalCount: 5,
    });

    const result = await getHandler({
      ctx: { user: mockUser as any, prisma: mockPrisma },
      input: { filters: {}, limit: 10, offset: 0 },
    });

    expect(result.nextCursor).toBeUndefined();
  });

  it("should not return nextCursor at exact last page boundary", async () => {
    vi.mocked(getAllUserBookings).mockResolvedValue({
      bookings: [],
      recurringInfo: [],
      totalCount: 20,
    });

    const result = await getHandler({
      ctx: { user: mockUser as any, prisma: mockPrisma },
      input: { filters: {}, limit: 10, offset: 10 },
    });

    expect(result.nextCursor).toBeUndefined();
  });

  it("should use statuses array when provided", async () => {
    vi.mocked(getAllUserBookings).mockResolvedValue({
      bookings: [],
      recurringInfo: [],
      totalCount: 0,
    });

    await getHandler({
      ctx: { user: mockUser as any, prisma: mockPrisma },
      input: { filters: { statuses: ["past", "cancelled"] }, limit: 10, offset: 0 },
    });

    expect(getAllUserBookings).toHaveBeenCalledWith(
      expect.objectContaining({ bookingListingByStatus: ["past", "cancelled"] })
    );
  });

  it("should use single status filter when statuses array not provided", async () => {
    vi.mocked(getAllUserBookings).mockResolvedValue({
      bookings: [],
      recurringInfo: [],
      totalCount: 0,
    });

    await getHandler({
      ctx: { user: mockUser as any, prisma: mockPrisma },
      input: { filters: { status: "past" }, limit: 10, offset: 0 },
    });

    expect(getAllUserBookings).toHaveBeenCalledWith(
      expect.objectContaining({ bookingListingByStatus: ["past"] })
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

  const createMockKysely = () => {
    const mockQueryBuilder: Record<string, any> = {
      select: vi.fn((_arg?: unknown) => mockQueryBuilder),
      selectAll: vi.fn(() => mockQueryBuilder),
      where: vi.fn(() => mockQueryBuilder),
      whereRef: vi.fn(() => mockQueryBuilder),
      innerJoin: vi.fn(() => mockQueryBuilder),
      orderBy: vi.fn(() => mockQueryBuilder),
      limit: vi.fn(() => mockQueryBuilder),
      offset: vi.fn(() => mockQueryBuilder),
      distinct: vi.fn(() => mockQueryBuilder),
      executeTakeFirst: vi.fn().mockResolvedValue({ bookingCount: 0 }),
      execute: vi.fn().mockResolvedValue([]),
    };

    const mockWithChain: Record<string, any> = {
      with: vi.fn(() => mockWithChain),
      selectFrom: vi.fn(() => mockQueryBuilder),
    };

    return {
      selectFrom: vi.fn(() => mockQueryBuilder),
      with: vi.fn(() => mockWithChain),
      _mockQueryBuilder: mockQueryBuilder,
      _mockWithChain: mockWithChain,
    } as unknown as Kysely<DB> & {
      _mockQueryBuilder: typeof mockQueryBuilder;
      _mockWithChain: typeof mockWithChain;
    };
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
                    compile: vi.fn(() => ({ sql: "SELECT * FROM bookings" })),
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

  describe("CTE-based query for team access", () => {
    it("should use CTEs via .with() when user has team access", async () => {
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

      expect(mockKysely.with).toHaveBeenCalled();
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

    it("should NOT fetch user IDs when no userIds filter is provided", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([1, 2]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.eventType.findMany = vi.fn().mockResolvedValue([]);
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

      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe("CTE + OR-based query optimization", () => {
    it("should build CTE chain with .with() for team access path", async () => {
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

      expect(mockKysely.with).toHaveBeenCalledWith("team_user_ids", expect.any(Function));
    });

    it("should use selectFrom Booking on the CTE chain", async () => {
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

      expect(mockKysely._mockWithChain.selectFrom).toHaveBeenCalledWith("Booking");
    });

    it("should execute paginated query and count in parallel", async () => {
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

      expect(mockKysely._mockQueryBuilder.execute).toHaveBeenCalled();
      expect(mockKysely._mockQueryBuilder.executeTakeFirst).toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("should throw BAD_REQUEST when userIds filter references non-existent users", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([1]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.eventType.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: { userIds: [999] },
          take: 10,
          skip: 0,
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "The requested users do not exist.",
      });
    });

    it("should throw BAD_REQUEST when eventTypeIds filter references non-existent event types", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.eventType.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: { eventTypeIds: [999] },
          take: 10,
          skip: 0,
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "The requested event-types do not exist.",
      });
    });
  });

  describe("orgId propagation", () => {
    it("should pass orgId to PermissionCheckService when user has orgId", async () => {
      const userWithOrg = { ...mockUser, orgId: 42 };
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await getBookings({
        user: userWithOrg,
        prisma: mockPrisma,
        kysely: mockKysely as unknown as Kysely<DB>,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 10,
        skip: 0,
      });

      expect(mockGetTeamIdsWithPermission).toHaveBeenCalledWith({
        userId: 1,
        permission: "booking.read",
        fallbackRoles: ["ADMIN", "OWNER"],
        orgId: 42,
      });
    });

    it("should not pass orgId when user has no orgId", async () => {
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

      expect(mockGetTeamIdsWithPermission).toHaveBeenCalledWith(
        expect.not.objectContaining({ orgId: expect.anything() })
      );
    });
  });

  describe("No team access path", () => {
    it("should complete without error when user has no team permissions", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {},
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should return zero totalCount when no bookings match", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

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
      expect(result.bookings).toEqual([]);
    });
  });

  describe("Filter application", () => {
    it("should call $queryRaw for teamIds filter", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.$queryRaw = vi.fn().mockResolvedValue([{ id: 100 }]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await getBookings({
        user: mockUser,
        prisma: mockPrisma,
        kysely: mockKysely as unknown as Kysely<DB>,
        bookingListingByStatus: ["upcoming"],
        filters: { teamIds: [1, 2] },
        take: 10,
        skip: 0,
      });

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it("should look up both direct and child event types for eventTypeIds filter", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.eventType.findMany = vi
        .fn()
        .mockResolvedValueOnce([{ id: 10 }])
        .mockResolvedValueOnce([{ id: 11 }]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await getBookings({
        user: mockUser,
        prisma: mockPrisma,
        kysely: mockKysely as unknown as Kysely<DB>,
        bookingListingByStatus: ["upcoming"],
        filters: { eventTypeIds: [10] },
        take: 10,
        skip: 0,
      });

      expect(mockPrisma.eventType.findMany).toHaveBeenCalledTimes(2);
    });

    it("should apply bookingUid filter without error", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: { bookingUid: "test-uid-123" },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should apply date range filters without error", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            afterStartDate: "2026-01-01",
            beforeEndDate: "2026-12-31",
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should apply attendeeName string filter without error", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: { attendeeName: "John Doe" },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should apply attendeeEmail string filter without error", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: { attendeeEmail: "john@example.com" },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });
  });

  describe("Sort and status handling", () => {
    it("should complete with custom sort order", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {},
          sort: { sortEnd: "desc" },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle multiple booking statuses", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["past", "cancelled"],
          filters: {},
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle each individual booking status", async () => {
      const statuses: ("upcoming" | "recurring" | "past" | "cancelled" | "unconfirmed")[] = [
        "upcoming",
        "recurring",
        "past",
        "cancelled",
        "unconfirmed",
      ];

      for (const status of statuses) {
        mockGetTeamIdsWithPermission.mockResolvedValue([]);
        mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
        mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);
        mockKysely = createMockKysely();

        await expect(
          getBookings({
            user: mockUser,
            prisma: mockPrisma,
            kysely: mockKysely as unknown as Kysely<DB>,
            bookingListingByStatus: [status],
            filters: {},
            take: 10,
            skip: 0,
          })
        ).resolves.not.toThrow();
      }
    });
  });

  describe("getOrderBy behavior via sort options", () => {
    it("should complete with sortStart asc", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {},
          sort: { sortStart: "asc" },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should complete with sortCreated desc", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {},
          sort: { sortCreated: "desc" },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should complete with sortUpdated asc", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {},
          sort: { sortUpdated: "asc" },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should use default sort when multiple statuses and no sort provided", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming", "past"],
          filters: {},
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should use default sort when no statuses and no sort provided", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: [],
          filters: {},
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });
  });

  describe("Attendee filter pre-computation", () => {
    it("should handle attendeeName with TextFilterValue contains operator", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeName: { type: "t", data: { operator: "contains", operand: "John" } },
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle attendeeName with startsWith operator", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeName: { type: "t", data: { operator: "startsWith", operand: "Jo" } },
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle attendeeName with endsWith operator", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeName: { type: "t", data: { operator: "endsWith", operand: "hn" } },
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle attendeeName with isEmpty operator", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeName: { type: "t", data: { operator: "isEmpty", operand: "" } },
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle attendeeName with notEquals operator (negative - uses EXISTS)", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeName: { type: "t", data: { operator: "notEquals", operand: "John" } },
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle attendeeName with notContains operator (negative - uses EXISTS)", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeName: { type: "t", data: { operator: "notContains", operand: "John" } },
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle attendeeName with isNotEmpty operator (negative - uses EXISTS)", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeName: { type: "t", data: { operator: "isNotEmpty", operand: "" } },
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle attendeeEmail with TextFilterValue contains operator", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeEmail: { type: "t", data: { operator: "contains", operand: "@example" } },
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle attendeeEmail with notEquals operator (negative - uses EXISTS)", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeEmail: { type: "t", data: { operator: "notEquals", operand: "bad@example.com" } },
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle attendeeEmail with notContains operator (negative - uses EXISTS)", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeEmail: { type: "t", data: { operator: "notContains", operand: "spam" } },
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle attendeeEmail with isNotEmpty operator (negative - uses EXISTS)", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeEmail: { type: "t", data: { operator: "isNotEmpty", operand: "" } },
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle both attendeeName and attendeeEmail positive filters simultaneously (intersection)", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeName: "John",
            attendeeEmail: "john@example.com",
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle both positive and negative attendee filters together", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeName: { type: "t", data: { operator: "contains", operand: "John" } },
            attendeeEmail: { type: "t", data: { operator: "notContains", operand: "spam" } },
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle attendeeName equals as string (positive pre-query)", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      // When attendeeName is a plain string, parseAttendeeFilterParams returns operator="equals"
      // which is positive → triggers pre-query
      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeName: "  John Doe  ", // should be trimmed
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle attendeeEmail with startsWith operator", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeEmail: { type: "t", data: { operator: "startsWith", operand: "john" } },
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle attendeeEmail with endsWith operator", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeEmail: { type: "t", data: { operator: "endsWith", operand: ".com" } },
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle attendeeEmail with isEmpty operator", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeEmail: { type: "t", data: { operator: "isEmpty", operand: "" } },
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });
  });

  describe("Date filter variations", () => {
    it("should apply afterUpdatedDate filter without error", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: { afterUpdatedDate: "2026-01-01" },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should apply beforeUpdatedDate filter without error", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: { beforeUpdatedDate: "2026-12-31" },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should apply afterCreatedDate filter without error", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: { afterCreatedDate: "2026-01-01" },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should apply beforeCreatedDate filter without error", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: { beforeCreatedDate: "2026-12-31" },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should apply all four date filters simultaneously", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            afterStartDate: "2026-01-01",
            beforeEndDate: "2026-12-31",
            afterUpdatedDate: "2026-02-01",
            beforeUpdatedDate: "2026-11-30",
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should apply created and updated date filters together", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            afterCreatedDate: "2026-01-01",
            beforeCreatedDate: "2026-06-30",
            afterUpdatedDate: "2026-01-01",
            beforeUpdatedDate: "2026-06-30",
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });
  });

  describe("Query branch structure", () => {
    it("should use direct selectFrom (no CTEs) when user has no team access", async () => {
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

      // No team access → should use selectFrom directly, NOT .with() CTEs
      expect(mockKysely.with).not.toHaveBeenCalled();
      expect(mockKysely.selectFrom).toHaveBeenCalledWith("Booking");
    });

    it("should use selectFrom on userIds filter path", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([1]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([{ id: 2, email: "member@example.com" }]);
      mockPrisma.eventType.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await getBookings({
        user: mockUser,
        prisma: mockPrisma,
        kysely: mockKysely as unknown as Kysely<DB>,
        bookingListingByStatus: ["upcoming"],
        filters: { userIds: [2] },
        take: 10,
        skip: 0,
      });

      // userIds filter → uses selectFrom, not CTEs
      expect(mockKysely.selectFrom).toHaveBeenCalledWith("Booking");
    });

    it("should build CTE chain with team_user_ids, team_emails, and team_event_type_ids", async () => {
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

      // team access → should chain 3 CTEs: team_user_ids, then team_emails, then team_event_type_ids
      expect(mockKysely.with).toHaveBeenCalledWith("team_user_ids", expect.any(Function));
      expect(mockKysely._mockWithChain.with).toHaveBeenCalledWith("team_emails", expect.any(Function));
      expect(mockKysely._mockWithChain.with).toHaveBeenCalledWith("team_event_type_ids", expect.any(Function));
    });
  });

  describe("Combined filter scenarios", () => {
    it("should handle teamIds + eventTypeIds filters together", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.$queryRaw = vi.fn().mockResolvedValue([{ id: 100 }]);
      mockPrisma.eventType.findMany = vi
        .fn()
        .mockResolvedValueOnce([{ id: 200 }])
        .mockResolvedValueOnce([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: { teamIds: [1], eventTypeIds: [200] },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle bookingUid + status filter", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["cancelled"],
          filters: { bookingUid: "some-uid" },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle date range + attendee filter combination", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            afterStartDate: "2026-01-01",
            beforeEndDate: "2026-12-31",
            attendeeName: "John",
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle all filter types combined", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.$queryRaw = vi.fn().mockResolvedValue([{ id: 100 }]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {
            teamIds: [1],
            bookingUid: "uid-123",
            afterStartDate: "2026-01-01",
            beforeEndDate: "2026-12-31",
            afterCreatedDate: "2026-01-01",
            beforeCreatedDate: "2026-06-30",
            attendeeName: { type: "t", data: { operator: "contains", operand: "test" } },
            attendeeEmail: { type: "t", data: { operator: "notContains", operand: "spam" } },
          },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty teamIds filter", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: { teamIds: [] },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle empty eventTypeIds filter", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: { eventTypeIds: [] },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle empty userIds filter (does not trigger userIds path)", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: { userIds: [] },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle user with null orgId", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: { ...mockUser, orgId: null },
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {},
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle user with undefined orgId", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: { id: 1, email: "user@example.com", orgId: undefined },
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {},
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should trim bookingUid filter whitespace", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      // The handler calls filters.bookingUid.trim()
      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: { bookingUid: "  test-uid  " },
          take: 10,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle skip=0 and take=1 (minimal pagination)", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {},
          take: 1,
          skip: 0,
        })
      ).resolves.not.toThrow();
    });

    it("should handle large skip value", async () => {
      mockGetTeamIdsWithPermission.mockResolvedValue([]);
      mockPrisma.user.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.booking.groupBy = vi.fn().mockResolvedValue([]);

      await expect(
        getBookings({
          user: mockUser,
          prisma: mockPrisma,
          kysely: mockKysely as unknown as Kysely<DB>,
          bookingListingByStatus: ["upcoming"],
          filters: {},
          take: 10,
          skip: 10000,
        })
      ).resolves.not.toThrow();
    });
  });
});
