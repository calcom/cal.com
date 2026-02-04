import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { vi } from "vitest";

import prisma from "@calcom/prisma";

import { outOfOfficeCreateOrUpdate } from "./outOfOfficeCreateOrUpdate.handler";

vi.mock("@calcom/prisma", () => {
  const mockObj = {
    outOfOfficeEntry: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  };
  return {
    default: mockObj,
    prisma: mockObj,
  };
});

// Setup mocks to control the implementations
const prismaMock = {
  outOfOfficeEntry: {
    findFirst: vi.fn().mockResolvedValue(undefined),
    findUnique: vi.fn().mockResolvedValue(undefined),
    upsert: vi.fn().mockResolvedValue(undefined),
  },
};

// Override the default mocks with your controlled mocks
vi.spyOn(prisma.outOfOfficeEntry, "findFirst").mockImplementation(prismaMock.outOfOfficeEntry.findFirst);
vi.spyOn(prisma.outOfOfficeEntry, "findUnique").mockImplementation(prismaMock.outOfOfficeEntry.findUnique);
vi.spyOn(prisma.outOfOfficeEntry, "upsert").mockImplementation(prismaMock.outOfOfficeEntry.upsert);

afterEach(() => {
  prismaMock.outOfOfficeEntry.findFirst.mockClear();
  prismaMock.outOfOfficeEntry.findUnique.mockClear();
  prismaMock.outOfOfficeEntry.upsert.mockClear();
});

const mockUser = {
  id: 4,
  username: "pro",
  email: "pro@example.com",
  password: {
    hash: "",
    userId: 0,
  },
  completedOnboarding: true,
  identityProvider: "CAL",
  profiles: [],
  avatar: "",
  organization: null,
  organizationId: null,
  locale: "en",
  timeZone: "UTC",
  defaultScheduleId: null,
  email_verified: true,
  name: null,
  theme: null,
} as const;

describe("outOfOfficeCreateOrUpdate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.setSystemTime(new Date("2024-11-22T03:23:45Z"));
  });

  it("should throw error if start date is after end date", async () => {
    const input = {
      dateRange: {
        startDate: new Date("2024-11-23T23:00:00.000Z"),
        endDate: new Date("2024-11-22T23:00:00.000Z"),
      },
      startDateOffset: 60,
      endDateOffset: 60,
      reasonId: 1,
      notes: "",
      toTeamUserId: null,
    };

    await expect(outOfOfficeCreateOrUpdate({ ctx: { user: mockUser }, input })).rejects.toThrow(
      "start_date_must_be_before_end_date"
    );
  });

  it("should handle timezone offset correctly", async () => {
    const input = {
      dateRange: {
        startDate: new Date("2025-03-28T23:00:00.000Z"),
        endDate: new Date("2025-04-01T22:00:00.000Z"),
      },
      startDateOffset: 60, // Paris timezone (CET)
      endDateOffset: 120, // Paris timezone (CEST) <- After summer time begins
      reasonId: 1,
      notes: "",
      toTeamUserId: null,
    };
    const startTimeUtc = "2025-03-29T00:00:00.000Z";
    const endTimeUtc = "2025-04-02T23:59:59.999Z";

    await outOfOfficeCreateOrUpdate({
      ctx: { user: mockUser },
      input,
    });

    expect(prisma.outOfOfficeEntry.findFirst).toHaveBeenNthCalledWith(1, {
      select: {
        toUserId: true,
        userId: true,
      },
      where: {
        OR: [
          {
            AND: [
              {
                start: {
                  lte: endTimeUtc,
                },
              },
              {
                end: {
                  gte: startTimeUtc,
                },
              },
            ],
          },
          {
            AND: [
              {
                start: {
                  gte: startTimeUtc,
                },
              },
              {
                end: {
                  lte: endTimeUtc,
                },
              },
            ],
          },
        ],
        toUserId: 4,
      },
    });
  });
});
