import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { vi } from "vitest";

import { prisma } from "@calcom/prisma";

import { outOfOfficeCreateOrUpdate } from "../outOfOffice.handler";

const prismaMock = {
  outOfOfficeEntry: {
    findFirst: vi.fn().mockResolvedValue(undefined),
    findUnique: vi.fn().mockResolvedValue(undefined),
    upsert: vi.fn().mockResolvedValue(undefined),
  },
  credential: {
    findFirst: vi.fn().mockResolvedValue({
      key: JSON.stringify({
        deel_api_key: "FAKE_DEEL_API_KEY",
        hris_profile_id: "FAKE_HRIS_PROFILE_ID",
      }),
    }),
  },
};
vi.spyOn(prisma.outOfOfficeEntry, "findFirst").mockImplementation(prismaMock.outOfOfficeEntry.findFirst);
vi.spyOn(prisma.outOfOfficeEntry, "findUnique").mockImplementation(prismaMock.outOfOfficeEntry.findUnique);
vi.spyOn(prisma.outOfOfficeEntry, "upsert").mockImplementation(prismaMock.outOfOfficeEntry.upsert);
vi.spyOn(prisma.credential, "findFirst").mockImplementation(prismaMock.credential.findFirst);

global.fetch = vi.fn();

afterEach(() => {
  prismaMock.outOfOfficeEntry.findFirst.mockClear();
  prismaMock.outOfOfficeEntry.findUnique.mockClear();
  prismaMock.outOfOfficeEntry.upsert.mockClear();
  prismaMock.credential.findFirst.mockClear();
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
      offset: 60,
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
        startDate: new Date("2024-11-23T23:00:00.000Z"),
        endDate: new Date("2024-11-23T23:00:00.000Z"),
      },
      offset: 60, // Paris timezone offset in minutes
      reasonId: 1,
      notes: "",
      toTeamUserId: null,
    };
    const startTimeUtc = "2024-11-24T00:00:00.000Z";
    const endTimeUtc = "2024-11-24T23:59:59.999Z";

    // Mock Deel API response
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ status: 201 }),
      status: 201,
    });

    await outOfOfficeCreateOrUpdate({
      ctx: { user: mockUser },
      input,
    });

    expect(global.fetch).toHaveBeenCalledWith("https://api.letsdeel.com/rest/v2/time_offs", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer FAKE_DEEL_API_KEY`,
      },
      body: JSON.stringify({
        data: {
          start_date: startTimeUtc,
          end_date: endTimeUtc,
          time_off_type_id: "1",
          recipient_profile_id: "FAKE_HRIS_PROFILE_ID",
          reason: "",
        },
      }),
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
