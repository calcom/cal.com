import { describe, expect, test, vi } from "vitest";
import dayjs from "@calcom/dayjs";
import { getScheduleSchema } from "./types";

describe("getScheduleSchema", () => {
  describe("Date Range Clamping", () => {
    test("should clamp endTime to 1 year from today when endTime is beyond 1 year", () => {
      vi.setSystemTime("2024-05-31T12:00:00Z");

      const input = {
        eventTypeId: 1,
        startTime: "2024-06-01T00:00:00.000Z",
        endTime: "2026-06-01T23:59:59.999Z", // 2 years in future
        timeZone: "UTC",
        isTeamEvent: false,
      };

      const result = getScheduleSchema.parse(input);

      const expectedMaxEndTime = dayjs.utc("2024-05-31T12:00:00Z").add(1, "year").toISOString();
      expect(result.endTime).toBe(expectedMaxEndTime);
    });

    test("should not clamp endTime when it is within 1 year from today", () => {
      vi.setSystemTime("2024-05-31T12:00:00Z");

      const input = {
        eventTypeId: 1,
        startTime: "2024-06-01T00:00:00.000Z",
        endTime: "2024-12-31T23:59:59.999Z", // 7 months in future
        timeZone: "UTC",
        isTeamEvent: false,
      };

      const result = getScheduleSchema.parse(input);

      expect(result.endTime).toBe("2024-12-31T23:59:59.999Z");
    });

    test("should clamp endTime to exactly 1 year from today", () => {
      vi.setSystemTime("2024-01-01T00:00:00Z");

      const input = {
        eventTypeId: 1,
        startTime: "2024-01-01T00:00:00.000Z",
        endTime: "2026-01-01T23:59:59.999Z", // 2 years in future
        timeZone: "UTC",
        isTeamEvent: false,
      };

      const result = getScheduleSchema.parse(input);

      const expectedMaxEndTime = dayjs.utc("2024-01-01T00:00:00Z").add(1, "year").toISOString();
      expect(result.endTime).toBe(expectedMaxEndTime);
      expect(result.endTime).toBe("2025-01-01T00:00:00.000Z");
    });

    test("should handle endTime at exactly 1 year boundary", () => {
      vi.setSystemTime("2024-05-31T12:00:00Z");

      const input = {
        eventTypeId: 1,
        startTime: "2024-06-01T00:00:00.000Z",
        endTime: "2025-05-31T12:00:00.000Z", // Exactly 1 year from now
        timeZone: "UTC",
        isTeamEvent: false,
      };

      const result = getScheduleSchema.parse(input);

      expect(result.endTime).toBe("2025-05-31T12:00:00.000Z");
    });

    test("should clamp endTime when it is 1 second beyond 1 year", () => {
      vi.setSystemTime("2024-05-31T12:00:00Z");

      const input = {
        eventTypeId: 1,
        startTime: "2024-06-01T00:00:00.000Z",
        endTime: "2025-05-31T12:00:01.000Z", // 1 second beyond 1 year
        timeZone: "UTC",
        isTeamEvent: false,
      };

      const result = getScheduleSchema.parse(input);

      const expectedMaxEndTime = dayjs.utc("2024-05-31T12:00:00Z").add(1, "year").toISOString();
      expect(result.endTime).toBe(expectedMaxEndTime);
      expect(result.endTime).toBe("2025-05-31T12:00:00.000Z");
    });
  });
});
