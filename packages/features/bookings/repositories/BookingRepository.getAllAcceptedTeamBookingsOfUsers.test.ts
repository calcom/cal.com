import type { PrismaClient } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingRepository } from "./BookingRepository";

function makeBooking(overrides: {
  id: number;
  userId: number | null;
  startTime?: Date;
  endTime?: Date;
  eventTypeId?: number;
  title?: string;
  attendees?: { email: string }[];
}) {
  return {
    id: overrides.id,
    uid: `uid-${overrides.id}`,
    userId: overrides.userId,
    startTime: overrides.startTime ?? new Date("2026-03-01T10:00:00Z"),
    endTime: overrides.endTime ?? new Date("2026-03-01T11:00:00Z"),
    eventTypeId: overrides.eventTypeId ?? 100,
    title: overrides.title ?? `Booking ${overrides.id}`,
    status: BookingStatus.ACCEPTED,
    attendees: overrides.attendees ?? [],
  };
}

describe("BookingRepository.getAllAcceptedTeamBookingsOfUsers", () => {
  let repository: BookingRepository;

  const mockFindMany = vi.fn();
  const mockPrisma = {
    booking: {
      findMany: mockFindMany,
    },
  } as unknown as PrismaClient;

  const baseParams = {
    teamId: 1,
    startDate: new Date("2026-03-01T00:00:00Z"),
    endDate: new Date("2026-03-31T23:59:59Z"),
    excludedUid: undefined,
    includeManagedEvents: false,
  };

  const users = [
    { id: 10, email: "alice@example.com" },
    { id: 20, email: "bob@example.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new BookingRepository(mockPrisma);
  });

  it("returns team bookings where user is the organizer (userId match)", async () => {
    const teamBooking = makeBooking({ id: 1, userId: 10, attendees: [{ email: "external@test.com" }] });

    mockFindMany.mockResolvedValueOnce([teamBooking]);
    mockFindMany.mockResolvedValueOnce([]);

    const result = await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      includeManagedEvents: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("returns team bookings where user is an attendee (email match)", async () => {
    const teamBooking = makeBooking({
      id: 2,
      userId: 999,
      attendees: [{ email: "alice@example.com" }],
    });

    mockFindMany.mockResolvedValueOnce([teamBooking]);
    mockFindMany.mockResolvedValueOnce([]);

    const result = await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      includeManagedEvents: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("excludes team bookings where user is neither organizer nor attendee", async () => {
    const irrelevantBooking = makeBooking({
      id: 3,
      userId: 999,
      attendees: [{ email: "stranger@test.com" }],
    });

    mockFindMany.mockResolvedValueOnce([irrelevantBooking]);
    mockFindMany.mockResolvedValueOnce([]);

    const result = await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      includeManagedEvents: true,
    });

    expect(result).toHaveLength(0);
  });

  it("returns managed bookings only when user is the organizer (not by attendee email)", async () => {
    const managedOrganizerBooking = makeBooking({ id: 4, userId: 10 });
    const managedAttendeeBooking = makeBooking({ id: 5, userId: 999 });

    mockFindMany.mockResolvedValueOnce([]);
    mockFindMany.mockResolvedValueOnce([managedOrganizerBooking, managedAttendeeBooking]);

    const result = await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      includeManagedEvents: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(4);
  });

  it("does not query managed bookings when includeManagedEvents is false", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      includeManagedEvents: false,
    });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventType: { teamId: 1 },
        }),
      })
    );
  });

  it("runs team and managed queries in parallel via Promise.all", async () => {
    const callOrder: string[] = [];

    mockFindMany.mockImplementation((args) => {
      if (args.where.eventType?.teamId) {
        callOrder.push("team");
        return Promise.resolve([]);
      }
      if (args.where.eventType?.parent) {
        callOrder.push("managed");
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      includeManagedEvents: true,
    });

    expect(mockFindMany).toHaveBeenCalledTimes(2);
  });

  it("returns count when shouldReturnCount is true", async () => {
    const teamBooking = makeBooking({ id: 1, userId: 10, attendees: [{ email: "ext@test.com" }] });
    const managedBooking = makeBooking({ id: 2, userId: 20 });

    mockFindMany.mockResolvedValueOnce([teamBooking]);
    mockFindMany.mockResolvedValueOnce([managedBooking]);

    const result = await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      includeManagedEvents: true,
      shouldReturnCount: true,
    });

    expect(result).toBe(2);
  });

  it("handles bookings with null userId correctly", async () => {
    const nullUserBooking = makeBooking({
      id: 6,
      userId: null,
      attendees: [{ email: "bob@example.com" }],
    });

    mockFindMany.mockResolvedValueOnce([nullUserBooking]);
    mockFindMany.mockResolvedValueOnce([]);

    const result = await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      includeManagedEvents: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(6);
  });

  it("handles managed booking with null userId (excluded)", async () => {
    const managedNullUser = makeBooking({ id: 7, userId: null });

    mockFindMany.mockResolvedValueOnce([]);
    mockFindMany.mockResolvedValueOnce([managedNullUser]);

    const result = await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      includeManagedEvents: true,
    });

    expect(result).toHaveLength(0);
  });

  it("combines team and managed bookings in results", async () => {
    const teamBooking = makeBooking({ id: 10, userId: 10, attendees: [{ email: "ext@test.com" }] });
    const managedBooking = makeBooking({ id: 11, userId: 20 });

    mockFindMany.mockResolvedValueOnce([teamBooking]);
    mockFindMany.mockResolvedValueOnce([managedBooking]);

    const result = await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      includeManagedEvents: true,
    });

    expect(result).toHaveLength(2);
    expect(result.map((b: { id: number }) => b.id)).toEqual([10, 11]);
  });

  it("applies excludedUid to query where clause", async () => {
    mockFindMany.mockResolvedValue([]);

    await repository.getAllAcceptedTeamBookingsOfUsers({
      ...baseParams,
      users,
      excludedUid: "reschedule-uid-123",
      includeManagedEvents: true,
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          uid: { not: "reschedule-uid-123" },
        }),
      })
    );
  });
});
