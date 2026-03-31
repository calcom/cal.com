import type { PrismaClient } from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingRepository } from "./BookingRepository";

function makeRawRow(overrides: {
  id: number;
  userId: number | null;
  eventTypeId?: number | null;
  startTime?: Date;
  endTime?: Date;
  title?: string;
  uid?: string;
}) {
  return {
    id: overrides.id,
    uid: overrides.uid ?? `uid-${overrides.id}`,
    userId: overrides.userId,
    startTime: overrides.startTime ?? new Date("2026-03-01T10:00:00Z"),
    endTime: overrides.endTime ?? new Date("2026-03-01T11:00:00Z"),
    eventTypeId: "eventTypeId" in overrides ? overrides.eventTypeId : 100,
    title: overrides.title ?? `Booking ${overrides.id}`,
  };
}

describe("BookingRepository.getAllAcceptedTeamBookingsOfUsers", () => {
  let repository: BookingRepository;

  const mockEventTypeFindMany = vi.fn();
  const mockQueryRaw = vi.fn();

  const mockPrisma = {
    eventType: {
      findMany: mockEventTypeFindMany,
    },
    $queryRaw: mockQueryRaw,
  } as unknown as PrismaClient;

  const baseParams = {
    teamId: 1,
    startDate: new Date("2026-03-01T00:00:00Z"),
    endDate: new Date("2026-03-31T23:59:59Z"),
    excludedUid: undefined as string | undefined,
    includeManagedEvents: false,
  };

  const users = [
    { id: 10, email: "alice@example.com" },
    { id: 20, email: "bob@example.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new BookingRepository(mockPrisma);
    // Default: team has event type IDs 100 and 200 (direct team, not managed)
    mockEventTypeFindMany.mockResolvedValue([{ id: 100, parentId: null }, { id: 200, parentId: null }]);
    // Default: no raw rows
    mockQueryRaw.mockResolvedValue([]);
  });

  it("returns empty array when users list is empty", async () => {
    const result = await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users: [],
      includeManagedEvents: true,
    });

    expect(result).toEqual([]);
    expect(mockEventTypeFindMany).not.toHaveBeenCalled();
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it("returns empty array when team has no event types", async () => {
    // includeManagedEvents: true -> first $queryRaw is event types, second is bookings
    mockQueryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      includeManagedEvents: true,
    });

    expect(result).toEqual([]);
  });

  it("returns bookings where user is the organizer (userId match)", async () => {
    const booking = makeRawRow({ id: 1, userId: 10, eventTypeId: 100 });
    // First call: event types, second call: bookings
    mockQueryRaw
      .mockResolvedValueOnce([{ id: 100, parentId: null }, { id: 200, parentId: null }])
      .mockResolvedValueOnce([booking]);

    const result = await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      includeManagedEvents: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("returns bookings where user is an attendee (from UNION ALL branch 2)", async () => {
    // Branch 2 returns a booking where userId doesn't match but attendee email did
    const booking = makeRawRow({ id: 2, userId: 999, eventTypeId: 100 });
    mockQueryRaw
      .mockResolvedValueOnce([{ id: 100, parentId: null }, { id: 200, parentId: null }])
      .mockResolvedValueOnce([booking]);

    const result = await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      includeManagedEvents: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("filters out bookings not belonging to team event types", async () => {
    const teamBooking = makeRawRow({ id: 1, userId: 10, eventTypeId: 100 });
    const nonTeamBooking = makeRawRow({ id: 2, userId: 10, eventTypeId: 999 });
    mockQueryRaw
      .mockResolvedValueOnce([{ id: 100, parentId: null }, { id: 200, parentId: null }])
      .mockResolvedValueOnce([teamBooking, nonTeamBooking]);

    const result = await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      includeManagedEvents: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("filters out bookings with null eventTypeId", async () => {
    const booking = makeRawRow({ id: 1, userId: 10, eventTypeId: null });
    mockQueryRaw.mockResolvedValueOnce([booking]);

    const result = await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
    });

    expect(result).toHaveLength(0);
  });

  it("deduplicates bookings from UNION ALL branches", async () => {
    const booking = makeRawRow({ id: 1, userId: 10, eventTypeId: 100 });
    // Same booking returned by both branches
    mockQueryRaw.mockResolvedValue([booking, booking]);

    const result = await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
    });

    expect(result).toHaveLength(1);
  });

  it("excludes booking matching excludedUid", async () => {
    const kept = makeRawRow({ id: 1, userId: 10, eventTypeId: 100, uid: "keep-me" });
    const excluded = makeRawRow({ id: 2, userId: 10, eventTypeId: 100, uid: "reschedule-uid" });
    mockQueryRaw.mockResolvedValue([kept, excluded]);

    const result = await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      excludedUid: "reschedule-uid",
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("returns count when shouldReturnCount is true", async () => {
    const b1 = makeRawRow({ id: 1, userId: 10, eventTypeId: 100 });
    const b2 = makeRawRow({ id: 2, userId: 20, eventTypeId: 200 });
    mockQueryRaw
      .mockResolvedValueOnce([{ id: 100, parentId: null }, { id: 200, parentId: null }])
      .mockResolvedValueOnce([b1, b2]);

    const result = await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      includeManagedEvents: true,
      shouldReturnCount: true,
    });

    expect(result).toBe(2);
  });

  it("returns 0 count when users list is empty and shouldReturnCount is true", async () => {
    const result = await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users: [],
      shouldReturnCount: true,
    });

    expect(result).toBe(0);
  });

  it("queries with managed event types when includeManagedEvents is true", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ id: 100, parentId: null }]).mockResolvedValueOnce([]);

    await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      includeManagedEvents: true,
    });

    // When includeManagedEvents is true, uses $queryRaw (UNION ALL) instead of findMany
    expect(mockEventTypeFindMany).not.toHaveBeenCalled();
    expect(mockQueryRaw).toHaveBeenCalledTimes(2);
  });

  it("queries without managed event types when includeManagedEvents is false", async () => {
    mockEventTypeFindMany.mockResolvedValue([{ id: 100 }]);
    mockQueryRaw.mockResolvedValue([]);

    await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      includeManagedEvents: false,
    });

    expect(mockEventTypeFindMany).toHaveBeenCalledWith({
      where: { teamId: 1 },
      select: { id: true, parentId: true },
    });
  });

});
