/**
 * Unit tests for ensureAvailableUsers.
 *
 * Covers:
 * - Single user available (date range includes slot, no conflict)
 * - Single user unavailable (no date range, or date range excludes slot, or conflict)
 * - Multiple users with mixed outcomes (subset available)
 * - Round-robin/collective: only a subset available returns that subset
 * - Throws NoAvailableUsersFound when no user is available
 */
import dayjs from "@calcom/dayjs";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureAvailableUsers } from "./ensureAvailableUsers";

const mockGetBusyTimesForLimitChecks = vi.fn();
const mockGetUsersAvailability = vi.fn();

vi.mock("@calcom/features/di/containers/BusyTimes", () => ({
  getBusyTimesService: () => ({
    getBusyTimesForLimitChecks: mockGetBusyTimesForLimitChecks,
  }),
}));
vi.mock("@calcom/features/di/containers/GetUserAvailability", () => ({
  getUserAvailabilityService: () => ({
    getUsersAvailability: mockGetUsersAvailability,
  }),
}));
vi.mock("@calcom/prisma", () => ({
  default: {
    schedule: { findUnique: vi.fn().mockResolvedValue(null) },
  },
}));

const logger = {
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  silly: vi.fn(),
} as unknown as Parameters<typeof ensureAvailableUsers>[2];

function makeUser(id: number, isFixed = false) {
  return {
    id,
    name: `User ${id}`,
    username: `user${id}`,
    email: `user${id}@test.com`,
    timeZone: "UTC",
    isFixed,
    credentials: [],
    userLevelSelectedCalendars: [],
    allSelectedCalendars: [],
  } as unknown as ReturnType<typeof makeUser>;
}

function makeDateRange(start: string, end: string) {
  return {
    start: dayjs.utc(start),
    end: dayjs.utc(end),
  };
}

function makeAvailability(opts: {
  dateRanges: { start: dayjs.Dayjs; end: dayjs.Dayjs }[];
  busy?: { start: string | Date; end: string | Date }[];
}) {
  return {
    oooExcludedDateRanges: opts.dateRanges,
    busy: opts.busy ?? [],
    timeZone: "UTC",
    dateRanges: opts.dateRanges,
    workingHours: [],
    dateOverrides: [],
    currentSeats: null,
  };
}

describe("ensureAvailableUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBusyTimesForLimitChecks.mockResolvedValue([]);
  });

  const baseInput = {
    dateFrom: "2025-06-01T14:00:00Z",
    dateTo: "2025-06-01T14:30:00Z",
    timeZone: "UTC",
  };

  const baseEventType = (users: unknown[], overrides: Record<string, unknown> = {}) =>
    ({
      id: 1,
      users,
      beforeEventBuffer: 0,
      afterEventBuffer: 0,
      bookingLimits: null,
      durationLimits: null,
      restrictionScheduleId: null,
      ...overrides,
    }) as unknown as Parameters<typeof ensureAvailableUsers>[0];

  it("returns single user when one user is available (date range includes slot, no conflict)", async () => {
    const user = makeUser(1);
    const eventType = baseEventType([user]);

    mockGetUsersAvailability.mockResolvedValue([
      makeAvailability({
        dateRanges: [makeDateRange("2025-06-01T08:00:00Z", "2025-06-01T18:00:00Z")],
        busy: [],
      }),
    ]);

    const result = await ensureAvailableUsers(eventType, baseInput, logger);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].availabilityData).toBeDefined();
    expect(mockGetUsersAvailability).toHaveBeenCalledWith(
      expect.objectContaining({
        users: [user],
        query: expect.objectContaining({
          dateFrom: baseInput.dateFrom,
          dateTo: baseInput.dateTo,
          eventTypeId: 1,
        }),
      })
    );
  });

  it("throws NoAvailableUsersFound when single user has no date range", async () => {
    const user = makeUser(1);
    const eventType = baseEventType([user]);

    mockGetUsersAvailability.mockResolvedValue([makeAvailability({ dateRanges: [] })]);

    await expect(ensureAvailableUsers(eventType, baseInput, logger)).rejects.toThrow(
      ErrorCode.NoAvailableUsersFound
    );
  });

  it("throws NoAvailableUsersFound when single user date range excludes slot", async () => {
    const user = makeUser(1);
    const eventType = baseEventType([user]);

    mockGetUsersAvailability.mockResolvedValue([
      makeAvailability({
        dateRanges: [makeDateRange("2025-06-01T08:00:00Z", "2025-06-01T12:00:00Z")],
      }),
    ]);

    await expect(ensureAvailableUsers(eventType, baseInput, logger)).rejects.toThrow(
      ErrorCode.NoAvailableUsersFound
    );
  });

  it("throws NoAvailableUsersFound when single user has conflict at slot", async () => {
    const user = makeUser(1);
    const eventType = baseEventType([user]);

    mockGetUsersAvailability.mockResolvedValue([
      makeAvailability({
        dateRanges: [makeDateRange("2025-06-01T08:00:00Z", "2025-06-01T18:00:00Z")],
        busy: [
          {
            start: new Date("2025-06-01T14:00:00Z"),
            end: new Date("2025-06-01T14:30:00Z"),
          },
        ],
      }),
    ]);

    await expect(ensureAvailableUsers(eventType, baseInput, logger)).rejects.toThrow(
      ErrorCode.NoAvailableUsersFound
    );
  });

  it("returns subset of users when multiple users and only some are available", async () => {
    const user1 = makeUser(1);
    const user2 = makeUser(2);
    const user3 = makeUser(3);
    const eventType = baseEventType([user1, user2, user3]);

    const slotRange = [makeDateRange("2025-06-01T08:00:00Z", "2025-06-01T18:00:00Z")];
    mockGetUsersAvailability.mockResolvedValue([
      makeAvailability({ dateRanges: [], busy: [] }),
      makeAvailability({ dateRanges: slotRange, busy: [] }),
      makeAvailability({
        dateRanges: slotRange,
        busy: [{ start: new Date("2025-06-01T14:00:00Z"), end: new Date("2025-06-01T14:30:00Z") }],
      }),
    ]);

    const result = await ensureAvailableUsers(eventType, baseInput, logger);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("returns multiple available users for round-robin/collective when subset available", async () => {
    const user1 = makeUser(1, true);
    const user2 = makeUser(2, false);
    const user3 = makeUser(3, false);
    const eventType = baseEventType([user1, user2, user3]);

    const slotRange = [makeDateRange("2025-06-01T08:00:00Z", "2025-06-01T18:00:00Z")];
    mockGetUsersAvailability.mockResolvedValue([
      makeAvailability({ dateRanges: slotRange, busy: [] }),
      makeAvailability({ dateRanges: slotRange, busy: [] }),
      makeAvailability({
        dateRanges: slotRange,
        busy: [{ start: new Date("2025-06-01T14:00:00Z"), end: new Date("2025-06-01T14:30:00Z") }],
      }),
    ]);

    const result = await ensureAvailableUsers(eventType, baseInput, logger);

    expect(result).toHaveLength(2);
    expect(result.map((u) => u.id)).toEqual([1, 2]);
  });

  it("throws NoAvailableUsersFound when all users have conflict or no date range", async () => {
    const user1 = makeUser(1);
    const user2 = makeUser(2);
    const eventType = baseEventType([user1, user2]);

    const slotRange = [makeDateRange("2025-06-01T08:00:00Z", "2025-06-01T18:00:00Z")];
    const busySlot = [{ start: new Date("2025-06-01T14:00:00Z"), end: new Date("2025-06-01T14:30:00Z") }];
    mockGetUsersAvailability.mockResolvedValue([
      makeAvailability({ dateRanges: [], busy: [] }),
      makeAvailability({ dateRanges: slotRange, busy: busySlot }),
    ]);

    await expect(ensureAvailableUsers(eventType, baseInput, logger)).rejects.toThrow(
      ErrorCode.NoAvailableUsersFound
    );
  });
});
