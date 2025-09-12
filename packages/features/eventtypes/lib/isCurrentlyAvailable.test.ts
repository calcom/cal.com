import { describe, it, expect, vi, beforeAll } from "vitest";

import { isCurrentlyAvailable } from "./getPublicEvent";

const prismaMock = {
  schedule: {
    findUniqueOrThrow: vi.fn(),
  },
};

vi.mock("@calcom/prisma", () => {
  return {
    PrismaClient: vi.fn(() => prismaMock),
  };
});

beforeAll(() => {
  vi.setSystemTime(new Date("2024-09-01T10:00:00Z"));
});

describe("isCurrentlyAvailable", () => {
  it("should return true if the current time is within the availability period", async () => {
    const mockAvailability = [
      {
        startTime: new Date("1970-01-01T09:00:00Z"),
        endTime: new Date("1970-01-01T17:00:00Z"),
        days: [0, 1, 2, 3, 4, 5, 6],
      },
    ];

    vi.spyOn(prismaMock.schedule, "findUniqueOrThrow").mockResolvedValue({
      availability: mockAvailability,
    });

    const result = await isCurrentlyAvailable({
      prisma: prismaMock,
      instantMeetingScheduleId: 1,
      availabilityTimezone: "Europe/London",
      length: 30,
    });

    expect(result).toBe(true);
  });

  it("should return false if the current time is outside the availability period", async () => {
    const mockAvailability = [
      {
        startTime: new Date("1970-01-01T09:00:00Z"),
        endTime: new Date("1970-01-01T17:00:00Z"),
        days: [1, 2, 3, 4, 5],
      },
    ];

    vi.spyOn(prismaMock.schedule, "findUniqueOrThrow").mockResolvedValue({
      availability: mockAvailability,
    });

    const result = await isCurrentlyAvailable({
      prisma: prismaMock,
      instantMeetingScheduleId: 1,
      availabilityTimezone: "Europe/London",
      length: 30,
    });

    expect(result).toBe(false);
  });

  it("should return false if there is no availability for the current day", async () => {
    const mockAvailability = [
      {
        startTime: new Date("1970-01-01T12:00:00Z"),
        endTime: new Date("1970-01-01T17:00:00Z"),
        days: [0],
      },
    ];

    vi.spyOn(prismaMock.schedule, "findUniqueOrThrow").mockResolvedValue({
      availability: mockAvailability,
    });

    const result = await isCurrentlyAvailable({
      prisma: prismaMock,
      instantMeetingScheduleId: 1,
      availabilityTimezone: "Europe/London",
      length: 30,
    });

    expect(result).toBe(false);
  });

  it("should return false if the meeting end time is outside the availability period", async () => {
    const mockAvailability = [
      {
        startTime: new Date("1970-01-01T09:00:00Z"),
        endTime: new Date("1970-01-01T17:00:00Z"),
        days: [1, 2, 3, 4, 5],
      },
    ];

    vi.spyOn(prismaMock.schedule, "findUniqueOrThrow").mockResolvedValue({
      availability: mockAvailability,
    });

    const result = await isCurrentlyAvailable({
      prisma: prismaMock,
      instantMeetingScheduleId: 1,
      availabilityTimezone: "Europe/London",
      length: 60,
    });

    expect(result).toBe(false);
  });

  it("should return false when there's an override blocking availability", async () => {
    const mockAvailability = [
      {
        startTime: new Date("1970-01-01T00:00:00Z"),
        endTime: new Date("1970-01-01T23:59:59Z"),
        days: [0, 1, 2, 3, 4, 5, 6],
      },
      // Date-specific override
      {
        date: new Date("2024-09-01"),
        startTime: new Date("2024-09-01T09:00:00Z"),
        endTime: new Date("2024-09-01T17:00:00Z"),
        days: [],
      },
    ];

    vi.spyOn(prismaMock.schedule, "findUniqueOrThrow").mockResolvedValue({
      availability: mockAvailability,
    });

    const result = await isCurrentlyAvailable({
      prisma: prismaMock,
      instantMeetingScheduleId: 1,
      availabilityTimezone: "Europe/London",
      length: 30,
    });

    expect(result).toBe(false);
  });
});
