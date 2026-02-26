import type { PrismaClient } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BookingRepository } from "./BookingRepository";

describe("BookingRepository.findUpcomingByAttendeeEmail", () => {
  let repository: BookingRepository;

  const mockFindMany = vi.fn();
  const mockPrisma = {
    booking: {
      findMany: mockFindMany,
    },
  } as unknown as PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new BookingRepository(mockPrisma);
    mockFindMany.mockResolvedValue([]);
  });

  it("should query by exact email (case-insensitive) and host user", async () => {
    await repository.findUpcomingByAttendeeEmail({
      attendeeEmail: "Booker@Example.com",
      hostUserId: 42,
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 42,
          startTime: { gt: expect.any(Date) },
          status: {
            in: [BookingStatus.ACCEPTED, BookingStatus.PENDING, BookingStatus.AWAITING_HOST],
          },
          attendees: {
            some: {
              email: { equals: "Booker@Example.com" },
            },
          },
        }),
      })
    );
  });

  it("should select the correct fields including report", async () => {
    await repository.findUpcomingByAttendeeEmail({
      attendeeEmail: "test@example.com",
      hostUserId: 1,
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          id: true,
          uid: true,
          title: true,
          startTime: true,
          endTime: true,
          status: true,
          attendees: { select: { email: true } },
          report: { select: { id: true } },
        }),
      })
    );
  });

  it("should order results by startTime ascending", async () => {
    await repository.findUpcomingByAttendeeEmail({
      attendeeEmail: "test@example.com",
      hostUserId: 1,
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { startTime: "asc" },
      })
    );
  });

  it("should return the results from prisma", async () => {
    const mockResults = [
      { id: 1, uid: "uid-1", title: "Meeting", startTime: new Date(), endTime: new Date(), status: "ACCEPTED" },
    ];
    mockFindMany.mockResolvedValue(mockResults);

    const result = await repository.findUpcomingByAttendeeEmail({
      attendeeEmail: "test@example.com",
      hostUserId: 1,
    });

    expect(result).toEqual(mockResults);
  });
});

describe("BookingRepository.findUpcomingByAttendeeDomain", () => {
  let repository: BookingRepository;

  const mockFindMany = vi.fn();
  const mockPrisma = {
    booking: {
      findMany: mockFindMany,
    },
  } as unknown as PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new BookingRepository(mockPrisma);
    mockFindMany.mockResolvedValue([]);
  });

  it("should query by email endsWith @domain (case-insensitive) and host user", async () => {
    await repository.findUpcomingByAttendeeDomain({
      domain: "spammer.com",
      hostUserId: 42,
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 42,
          startTime: { gt: expect.any(Date) },
          status: {
            in: [BookingStatus.ACCEPTED, BookingStatus.PENDING, BookingStatus.AWAITING_HOST],
          },
          attendees: {
            some: {
              email: { endsWith: "@spammer.com" },
            },
          },
        }),
      })
    );
  });

  it("should select the same fields as findUpcomingByAttendeeEmail", async () => {
    await repository.findUpcomingByAttendeeDomain({
      domain: "example.com",
      hostUserId: 1,
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          id: true,
          uid: true,
          title: true,
          startTime: true,
          endTime: true,
          status: true,
          attendees: { select: { email: true } },
          report: { select: { id: true } },
        }),
      })
    );
  });

  it("should order results by startTime ascending", async () => {
    await repository.findUpcomingByAttendeeDomain({
      domain: "example.com",
      hostUserId: 1,
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { startTime: "asc" },
      })
    );
  });
});
