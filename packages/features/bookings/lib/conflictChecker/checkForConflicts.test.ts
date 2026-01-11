import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";
import type { CurrentSeats } from "@calcom/features/availability/lib/getUserAvailability";
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

  describe("comprehensive edge cases and boundary conditions", () => {
    it("should return false for empty busy array", () => {
      const result = checkForConflicts({
        ...createTestData("2023-01-01T09:00:00Z"),
        busy: [],
      });
      expect(result).toBe(false);
    });

    it("should handle slot that starts exactly when busy period ends", () => {
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

    it("should handle slot that ends exactly when busy period starts", () => {
      const result = checkForConflicts({
        ...createTestData("2023-01-01T08:30:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:30:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(false);
    });

    it("should handle slot start exactly matching busy period start (inclusive)", () => {
      const result = checkForConflicts({
        ...createTestData("2023-01-01T09:00:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:15:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(true);
    });

    it("should handle slot end exactly matching busy period end (inclusive)", () => {
      const result = checkForConflicts({
        ...createTestData("2023-01-01T09:15:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:30:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:45:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(true);
    });

    it("should handle very short event length (1 minute)", () => {
      const result = checkForConflicts({
        time: dayjs("2023-01-01T09:00:00Z"),
        eventLength: 1,
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:00:30Z").toDate(),
            end: dayjs.utc("2023-01-01T09:01:30Z").toDate(),
          },
        ],
      });
      expect(result).toBe(true);
    });

    it("should handle very long event length (8 hours)", () => {
      const result = checkForConflicts({
        time: dayjs("2023-01-01T09:00:00Z"),
        eventLength: 480, // 8 hours
        busy: [
          {
            start: dayjs.utc("2023-01-01T12:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T13:00:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(true);
    });
  });

  describe("multiple busy periods scenarios", () => {
    it("should return true when first busy period conflicts", () => {
      const result = checkForConflicts({
        ...createTestData("2023-01-01T09:00:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:15:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:45:00Z").toDate(),
          },
          {
            start: dayjs.utc("2023-01-01T10:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T11:00:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(true);
    });

    it("should return true when last busy period conflicts", () => {
      const result = checkForConflicts({
        ...createTestData("2023-01-01T10:30:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T08:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:00:00Z").toDate(),
          },
          {
            start: dayjs.utc("2023-01-01T10:45:00Z").toDate(),
            end: dayjs.utc("2023-01-01T11:15:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(true);
    });

    it("should return true when middle busy period conflicts", () => {
      const result = checkForConflicts({
        ...createTestData("2023-01-01T10:00:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T08:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:00:00Z").toDate(),
          },
          {
            start: dayjs.utc("2023-01-01T10:15:00Z").toDate(),
            end: dayjs.utc("2023-01-01T10:45:00Z").toDate(),
          },
          {
            start: dayjs.utc("2023-01-01T11:00:00Z").toDate(),
            end: dayjs.utc("2023-01-01T12:00:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(true);
    });

    it("should handle many non-overlapping busy periods", () => {
      const busyPeriods = [];
      for (let i = 0; i < 10; i++) {
        const hour = (8 + i * 2) % 24; // Wrap around to prevent invalid hours
        busyPeriods.push({
          start: dayjs.utc(`2023-01-01T${hour.toString().padStart(2, "0")}:00:00Z`).toDate(),
          end: dayjs.utc(`2023-01-01T${hour.toString().padStart(2, "0")}:30:00Z`).toDate(),
        });
      }

      const result = checkForConflicts({
        ...createTestData("2023-01-01T07:00:00Z"),
        busy: busyPeriods,
      });
      expect(result).toBe(false);
    });

    it("should handle overlapping busy periods", () => {
      const result = checkForConflicts({
        ...createTestData("2023-01-01T09:00:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:15:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:45:00Z").toDate(),
          },
          {
            start: dayjs.utc("2023-01-01T09:30:00Z").toDate(),
            end: dayjs.utc("2023-01-01T10:00:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(true);
    });
  });

  describe("currentSeats comprehensive scenarios", () => {
    it("should return false when currentSeats has exact time match", () => {
      const testTime = dayjs.utc("2023-01-01T09:00:00Z");
      const currentSeats: CurrentSeats = [
        {
          uid: "booking-1",
          startTime: testTime.toDate(),
          _count: { attendees: 2 },
        },
      ];

      const result = checkForConflicts({
        time: testTime,
        eventLength: 30,
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:15:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:45:00Z").toDate(),
          },
        ],
        currentSeats,
      });
      expect(result).toBe(false);
    });

    it("should return true when currentSeats has no matching time but busy period conflicts", () => {
      const currentSeats: CurrentSeats = [
        {
          uid: "booking-1",
          startTime: dayjs.utc("2023-01-01T08:00:00Z").toDate(),
          _count: { attendees: 1 },
        },
      ];

      const result = checkForConflicts({
        time: dayjs.utc("2023-01-01T09:00:00Z"),
        eventLength: 30,
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:15:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:45:00Z").toDate(),
          },
        ],
        currentSeats,
      });
      expect(result).toBe(true);
    });

    it("should handle multiple currentSeats with one matching", () => {
      const testTime = dayjs.utc("2023-01-01T09:00:00Z");
      const currentSeats: CurrentSeats = [
        {
          uid: "booking-1",
          startTime: dayjs.utc("2023-01-01T08:00:00Z").toDate(),
          _count: { attendees: 1 },
        },
        {
          uid: "booking-2",
          startTime: testTime.toDate(),
          _count: { attendees: 1 },
        },
      ];

      const result = checkForConflicts({
        time: testTime,
        eventLength: 30,
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:15:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:45:00Z").toDate(),
          },
        ],
        currentSeats,
      });
      expect(result).toBe(false);
    });

    it("should handle empty currentSeats array", () => {
      const result = checkForConflicts({
        time: dayjs.utc("2023-01-01T09:00:00Z"),
        eventLength: 30,
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:15:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:45:00Z").toDate(),
          },
        ],
        currentSeats: [],
      });
      expect(result).toBe(true);
    });
  });

  describe("timezone and date handling", () => {
    it("should handle different timezone inputs correctly", () => {
      const result = checkForConflicts({
        time: dayjs("2023-01-01T09:00:00-05:00"), // EST
        eventLength: 30,
        busy: [
          {
            start: dayjs.utc("2023-01-01T14:15:00Z").toDate(), // UTC equivalent of 9:15 EST
            end: dayjs.utc("2023-01-01T14:45:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(true);
    });

    it("should handle cross-day boundaries", () => {
      const result = checkForConflicts({
        time: dayjs.utc("2023-01-01T23:45:00Z"),
        eventLength: 30,
        busy: [
          {
            start: dayjs.utc("2023-01-02T00:00:00Z").toDate(),
            end: dayjs.utc("2023-01-02T00:30:00Z").toDate(),
          },
        ],
      });
      expect(result).toBe(true);
    });
  });

  describe("performance and stress scenarios", () => {
    it("should handle large number of busy periods efficiently", () => {
      const busyPeriods = [];
      for (let i = 0; i < 1000; i++) {
        const hour = (8 + (i % 12)) % 24; // Wrap around to prevent invalid hours
        const minute = i % 60;
        const endMinute = ((i % 60) + 15) % 60;
        const endHour = endMinute < minute ? (hour + 1) % 24 : hour; // Handle minute overflow

        busyPeriods.push({
          start: dayjs
            .utc(`2023-01-01T${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00Z`)
            .toDate(),
          end: dayjs
            .utc(
              `2023-01-01T${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}:00Z`
            )
            .toDate(),
        });
      }

      const startTime = performance.now();
      const result = checkForConflicts({
        ...createTestData("2023-01-01T07:00:00Z"),
        busy: busyPeriods,
      });
      const endTime = performance.now();

      expect(result).toBe(false);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it("should handle zero-duration busy periods", () => {
      const result = checkForConflicts({
        ...createTestData("2023-01-01T09:00:00Z"),
        busy: [
          {
            start: dayjs.utc("2023-01-01T09:15:00Z").toDate(),
            end: dayjs.utc("2023-01-01T09:15:00Z").toDate(), // Zero duration
          },
        ],
      });
      expect(result).toBe(true);
    });
  });
});
