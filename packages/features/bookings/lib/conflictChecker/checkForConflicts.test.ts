import { describe, expect, it } from "vitest";

import type { CurrentSeats } from "@calcom/core/getUserAvailability";
import dayjs from "@calcom/dayjs";
import type { EventBusyDate } from "@calcom/types/Calendar";

import { checkForConflicts } from "./checkForConflicts";

describe("checkForConflicts", () => {
  const createTestData = (time: string) => ({
    time: dayjs(time),
    eventLength: 30,
    busy: [] as EventBusyDate[],
  });

  describe("currentSeats handling", () => {
    it("should return false if slot exists in currentSeats", () => {
      const currentSeats: CurrentSeats = [
        {
          uid: "123",
          startTime: dayjs.utc("2023-01-01T09:00:00Z").toDate(),
          _count: { attendees: 1 },
        },
      ];

      const result = checkForConflicts({
        ...createTestData("2023-01-01T09:00:00Z"),
        currentSeats,
      });

      expect(result).toBe(false);
    });
  });

  describe("busy time overlap scenarios", () => {
    it("should return false when no busy periods", () => {
      const result = checkForConflicts(createTestData("2023-01-01T09:00:00Z"));
      expect(result).toBe(false);
    });

    it("should return false when busy period ends before slot starts", () => {
      const result = checkForConflicts({
        ...createTestData("2023-01-01T09:00:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T08:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T08:30:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(false);
    });

    it("should return false when busy period starts after slot ends", () => {
      const result = checkForConflicts({
        ...createTestData("2023-01-01T09:00:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T10:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T10:30:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(false);
    });

    it("should return true when slot start falls within busy period", () => {
      const result = checkForConflicts({
        ...createTestData("2023-01-01T09:15:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:30:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(true);
    });

    it("should return true when slot end falls within busy period", () => {
      const result = checkForConflicts({
        ...createTestData("2023-01-01T08:45:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:30:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(true);
    });

    it("should return true when busy period is completely contained within slot", () => {
      const result = checkForConflicts({
        ...createTestData("2023-01-01T09:00:00Z"),
        eventLength: 60,
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:15:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:45:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(true);
    });

    it("should return true when slot is completely contained within busy period", () => {
      const result = checkForConflicts({
        ...createTestData("2023-01-01T09:15:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T10:00:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(true);
    });

    it("should return false when multiple non-overlapping busy periods", () => {
      const result = checkForConflicts({
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
      expect(result).toBe(false);
    });

    it("should return true if any busy period overlaps", () => {
      const result = checkForConflicts({
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
      expect(result).toBe(true);
    });

    it("should handle exact boundary conditions", () => {
      const result = checkForConflicts({
        ...createTestData("2023-01-01T09:30:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:30:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(false);
    });
  });
});
