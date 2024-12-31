import prismaMock from "./../../../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { vi } from "vitest";

import { outOfOfficeCreateOrUpdate } from "../outOfOffice.handler";

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
  organizationId: 123,
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

    // Reset all mocks with default implementations
    prismaMock.credential.findFirst.mockResolvedValue({
      key: JSON.stringify({
        deel_api_key: "FAKE_DEEL_API_KEY",
        hris_profile_id: "FAKE_HRIS_PROFILE_ID",
      }),
    });

    prismaMock.outOfOfficeEntry.findFirst.mockResolvedValue(null);
    prismaMock.outOfOfficeEntry.findUnique.mockResolvedValue(null);
    prismaMock.outOfOfficeEntry.upsert.mockResolvedValue({
      id: 1,
      userId: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      start: new Date("2024-11-23T23:00:00.000Z"),
      end: new Date("2024-11-23T23:00:00.000Z"),
      uuid: "uuid",
      reasonId: 1,
      toUserId: null,
      notes: null,
    });
    prismaMock.credential.findFirst.mockResolvedValue({
      key: {
        deel_api_key: "FAKE_DEEL_API_KEY",
        hris_profile_id: "FAKE_HRIS_PROFILE_ID",
      },
    });

    // Reset fetch mock
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 201 }),
      status: 201,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
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

  it("should handle timezone offset correctly and create Deel OOO entry", async () => {
    const input = {
      dateRange: {
        startDate: new Date("2024-11-23T23:00:00.000Z"),
        endDate: new Date("2024-11-23T23:00:00.000Z"),
      },
      offset: 60,
      reasonId: 1,
      notes: "Test notes",
      toTeamUserId: null,
    };

    const startTimeUtc = "2024-11-24T00:00:00.000Z";
    const endTimeUtc = "2024-11-24T23:59:59.999Z";

    await outOfOfficeCreateOrUpdate({
      ctx: { user: mockUser },
      input,
    });

    // Verify credential lookup
    expect(prismaMock.credential.findFirst).toHaveBeenCalledWith({
      where: {
        teamId: mockUser.organizationId,
        appId: "deel",
      },
      select: {
        key: true,
      },
    });

    // Verify Deel API call
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
          reason: "Test notes",
        },
      }),
    });

    // Verify OOO entry lookup
    expect(prismaMock.outOfOfficeEntry.findFirst).toHaveBeenCalledWith({
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

  it("should throw error when Deel credentials are not found", async () => {
    prismaMock.credential.findFirst.mockResolvedValueOnce(null);

    const input = {
      dateRange: {
        startDate: new Date("2024-11-23T23:00:00.000Z"),
        endDate: new Date("2024-11-23T23:00:00.000Z"),
      },
      offset: 60,
      reasonId: 1,
      notes: "",
      toTeamUserId: null,
    };

    await expect(outOfOfficeCreateOrUpdate({ ctx: { user: mockUser }, input })).rejects.toThrow(
      "no_deel_credentials"
    );
  });

  it("should throw error when Deel API call fails", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ status: 400 }),
      status: 400,
    });

    const input = {
      dateRange: {
        startDate: new Date("2024-11-23T23:00:00.000Z"),
        endDate: new Date("2024-11-23T23:00:00.000Z"),
      },
      offset: 60,
      reasonId: 1,
      notes: "",
      toTeamUserId: null,
    };

    await expect(outOfOfficeCreateOrUpdate({ ctx: { user: mockUser }, input })).rejects.toThrow(
      "deel_ooo_entry_creation_failed"
    );
  });
});
