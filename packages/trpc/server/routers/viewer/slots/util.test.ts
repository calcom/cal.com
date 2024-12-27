import { describe, expect, it } from "vitest";

import type { GetAvailabilityUser } from "@calcom/core/getUserAvailability";
import dayjs from "@calcom/dayjs";
import type { EventBusyDate } from "@calcom/types/Calendar";

import { checkIfIsAvailable } from "./util";
import { getUsersWithCredentialsConsideringContactOwner } from "./util";

describe("getUsersWithCredentialsConsideringContactOwner", () => {
  const createMockUser = (email: string): GetAvailabilityUser => ({
    id: Math.random(),
    email,
    name: email.split("@")[0],
    username: email.split("@")[0],
    timeZone: "UTC",
    weekStart: "Monday",
    defaultScheduleId: null,
    bufferTime: 0,
    locale: "en",
  });

  it("should return all hosts when contact owner does not exist", () => {
    const hosts = [
      { isFixed: true, user: createMockUser("host1@example.com") },
      { isFixed: false, user: createMockUser("host2@example.com") },
    ];
    const result = getUsersWithCredentialsConsideringContactOwner({
      contactOwnerEmail: "nonexistent@example.com",
      hosts,
    });
    expect(result).toHaveLength(2);
    expect(result.map((u) => u.email)).toEqual(["host1@example.com", "host2@example.com"]);
  });

  it("should return all hosts when contact owner is a fixed host", () => {
    const hosts = [
      { isFixed: true, user: createMockUser("host1@example.com") },
      { isFixed: false, user: createMockUser("host2@example.com") },
    ];
    const result = getUsersWithCredentialsConsideringContactOwner({
      contactOwnerEmail: "host1@example.com",
      hosts,
    });
    expect(result).toHaveLength(2);
    expect(result.map((u) => u.email)).toEqual(["host1@example.com", "host2@example.com"]);
  });

  it("should return contact owner and fixed hosts when contact owner is not fixed", () => {
    const hosts = [
      { isFixed: true, user: createMockUser("host1@example.com") },
      { isFixed: false, user: createMockUser("host2@example.com") },
      { isFixed: false, user: createMockUser("contactowner@example.com") },
    ];
    const result = getUsersWithCredentialsConsideringContactOwner({
      contactOwnerEmail: "contactowner@example.com",
      hosts,
    });
    expect(result).toHaveLength(2);
    expect(result.map((u) => u.email)).toEqual(["host1@example.com", "contactowner@example.com"]);
  });

  it("should return all hosts when contactOwnerEmail is null", () => {
    const hosts = [
      { isFixed: true, user: createMockUser("host1@example.com") },
      { isFixed: false, user: createMockUser("host2@example.com") },
    ];
    const result = getUsersWithCredentialsConsideringContactOwner({
      contactOwnerEmail: null,
      hosts,
    });
    expect(result).toHaveLength(2);
    expect(result.map((u) => u.email)).toEqual(["host1@example.com", "host2@example.com"]);
  });

  it("should return only fixed hosts when there's no contact owner", () => {
    const hosts = [
      { isFixed: true, user: createMockUser("host1@example.com") },
      { isFixed: false, user: createMockUser("host2@example.com") },
      { isFixed: true, user: createMockUser("host3@example.com") },
    ];
    const result = getUsersWithCredentialsConsideringContactOwner({
      contactOwnerEmail: null,
      hosts,
    });
    expect(result).toHaveLength(3);
    expect(result.map((u) => u.email)).toEqual([
      "host1@example.com",
      "host2@example.com",
      "host3@example.com",
    ]);
  });
});

describe("checkIfIsAvailable", () => {
  const createTestData = (time: string) => ({
    time: dayjs(time),
    eventLength: 30,
    busy: [] as EventBusyDate[],
  });

  describe("currentSeats handling", () => {
    it("should return true if slot exists in currentSeats", () => {
      const currentSeats: CurrentSeats = [
        {
          uid: "123",
          startTime: dayjs.utc("2023-01-01T09:00:00Z").toDate(),
          _count: { attendees: 1 },
        },
      ];

      const result = checkIfIsAvailable({
        ...createTestData("2023-01-01T09:00:00Z"),
        currentSeats,
      });

      expect(result).toBe(true);
    });
  });

  describe("busy time overlap scenarios", () => {
    it("should return true when no busy periods", () => {
      const result = checkIfIsAvailable(createTestData("2023-01-01T09:00:00Z"));
      expect(result).toBe(true);
    });

    it("should return true when busy period ends before slot starts", () => {
      const result = checkIfIsAvailable({
        ...createTestData("2023-01-01T09:00:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T08:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T08:30:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(true);
    });

    it("should return true when busy period starts after slot ends", () => {
      const result = checkIfIsAvailable({
        ...createTestData("2023-01-01T09:00:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T10:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T10:30:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(true);
    });

    it("should return false when slot start falls within busy period", () => {
      const result = checkIfIsAvailable({
        ...createTestData("2023-01-01T09:15:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:30:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(false);
    });

    it("should return false when slot end falls within busy period", () => {
      const result = checkIfIsAvailable({
        ...createTestData("2023-01-01T08:45:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:30:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(false);
    });

    it("should return false when busy period is completely contained within slot", () => {
      const result = checkIfIsAvailable({
        ...createTestData("2023-01-01T09:00:00Z"),
        eventLength: 60,
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:15:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:45:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(false);
    });

    it("should return false when slot is completely contained within busy period", () => {
      const result = checkIfIsAvailable({
        ...createTestData("2023-01-01T09:15:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T10:00:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(false);
    });

    it("should return true when multiple non-overlapping busy periods", () => {
      const result = checkIfIsAvailable({
        ...createTestData("2023-01-01T09:30:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T08:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:00:00Z").toDate(),
          },
          {
            start: dayjs.utc("2023-01-01T10:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T11:00:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(true);
    });

    it("should return false if any busy period overlaps", () => {
      const result = checkIfIsAvailable({
        ...createTestData("2023-01-01T09:30:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T08:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:00:00Z").toDate(),
          },
          {
            start: dayjs.utc("2023-01-01T09:45:00Z").toDate(),
            end: dayjs.utc("2023-01-01T10:00:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(false);
    });

    it("should handle exact boundary conditions", () => {
      const result = checkIfIsAvailable({
        ...createTestData("2023-01-01T09:30:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:30:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(true);
    });
  });
});
