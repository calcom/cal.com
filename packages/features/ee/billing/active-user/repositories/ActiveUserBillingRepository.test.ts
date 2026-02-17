import { BookingStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveUserBillingRepository } from "./ActiveUserBillingRepository";

function createMockPrismaClient() {
  return {
    booking: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    attendee: {
      findMany: vi.fn(),
    },
  };
}

describe("ActiveUserBillingRepository.getLastActiveAt", () => {
  let repo: ActiveUserBillingRepository;
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repo = new ActiveUserBillingRepository(mockPrisma as any);
  });

  it("returns null when user has no accepted bookings as host or attendee", async () => {
    mockPrisma.booking.findFirst.mockResolvedValue(null);

    const result = await repo.getLastActiveAt(1, "user@test.com");

    expect(result).toBeNull();
    expect(mockPrisma.booking.findFirst).toHaveBeenCalledTimes(2);
  });

  it("returns the host booking date when user only hosted", async () => {
    const hostDate = new Date("2026-01-15T10:00:00Z");
    mockPrisma.booking.findFirst.mockResolvedValueOnce({ startTime: hostDate }).mockResolvedValueOnce(null);

    const result = await repo.getLastActiveAt(1, "user@test.com");

    expect(result).toEqual(hostDate);
  });

  it("returns the attendee booking date when user only attended", async () => {
    const attendeeDate = new Date("2026-01-20T14:00:00Z");
    mockPrisma.booking.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ startTime: attendeeDate });

    const result = await repo.getLastActiveAt(1, "user@test.com");

    expect(result).toEqual(attendeeDate);
  });

  it("returns the more recent date when user has both host and attendee bookings", async () => {
    const hostDate = new Date("2026-01-10T10:00:00Z");
    const attendeeDate = new Date("2026-01-20T14:00:00Z");
    mockPrisma.booking.findFirst
      .mockResolvedValueOnce({ startTime: hostDate })
      .mockResolvedValueOnce({ startTime: attendeeDate });

    const result = await repo.getLastActiveAt(1, "user@test.com");

    expect(result).toEqual(attendeeDate);
  });

  it("returns the host date when it is more recent than attendee date", async () => {
    const hostDate = new Date("2026-02-01T10:00:00Z");
    const attendeeDate = new Date("2026-01-15T14:00:00Z");
    mockPrisma.booking.findFirst
      .mockResolvedValueOnce({ startTime: hostDate })
      .mockResolvedValueOnce({ startTime: attendeeDate });

    const result = await repo.getLastActiveAt(1, "user@test.com");

    expect(result).toEqual(hostDate);
  });

  it("queries with correct filters for host bookings", async () => {
    mockPrisma.booking.findFirst.mockResolvedValue(null);

    await repo.getLastActiveAt(42, "host@test.com");

    expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 42,
        status: BookingStatus.ACCEPTED,
      },
      orderBy: { startTime: "desc" },
      select: { startTime: true },
    });
  });

  it("queries with correct filters for attendee bookings", async () => {
    mockPrisma.booking.findFirst.mockResolvedValue(null);

    await repo.getLastActiveAt(42, "attendee@test.com");

    expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith({
      where: {
        attendees: { some: { email: "attendee@test.com" } },
        status: BookingStatus.ACCEPTED,
      },
      orderBy: { startTime: "desc" },
      select: { startTime: true },
    });
  });

  it("runs both queries in parallel", async () => {
    const resolveOrder: string[] = [];

    mockPrisma.booking.findFirst
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOrder.push("host");
            resolve(null);
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOrder.push("attendee");
            resolve(null);
          })
      );

    await repo.getLastActiveAt(1, "user@test.com");

    expect(resolveOrder).toEqual(["host", "attendee"]);
  });
});
