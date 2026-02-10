import { describe, expect, it } from "vitest";
import { applyPreferredFlagToSlots } from "./util";

describe("applyPreferredFlagToSlots", () => {
  describe("auto mode - prefer mornings", () => {
    const config = { mode: "auto" as const, auto: { preferTimeOfDay: "morning" as const } };

    it("marks morning slots (before 12pm) as preferred", () => {
      const slots = {
        "2026-03-10": [
          { time: "2026-03-10T08:00:00.000Z" },
          { time: "2026-03-10T09:30:00.000Z" },
          { time: "2026-03-10T11:00:00.000Z" },
        ],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(result["2026-03-10"][0].preferred).toBe(true);
      expect(result["2026-03-10"][1].preferred).toBe(true);
      expect(result["2026-03-10"][2].preferred).toBe(true);
    });

    it("marks afternoon slots (12pm+) as not preferred", () => {
      const slots = {
        "2026-03-10": [
          { time: "2026-03-10T12:00:00.000Z" },
          { time: "2026-03-10T14:00:00.000Z" },
          { time: "2026-03-10T17:30:00.000Z" },
        ],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(result["2026-03-10"][0].preferred).toBe(false);
      expect(result["2026-03-10"][1].preferred).toBe(false);
      expect(result["2026-03-10"][2].preferred).toBe(false);
    });

    it("handles timezone conversion correctly", () => {
      const slots = {
        "2026-03-10": [{ time: "2026-03-10T16:00:00.000Z" }, { time: "2026-03-10T20:00:00.000Z" }],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "America/New_York",
        eventLength: 30,
      });

      expect(result["2026-03-10"][0].preferred).toBe(false);
      expect(result["2026-03-10"][1].preferred).toBe(false);
    });

    it("handles mixed morning and afternoon slots", () => {
      const slots = {
        "2026-03-10": [
          { time: "2026-03-10T09:00:00.000Z" },
          { time: "2026-03-10T11:30:00.000Z" },
          { time: "2026-03-10T12:00:00.000Z" },
          { time: "2026-03-10T15:00:00.000Z" },
        ],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(result["2026-03-10"][0].preferred).toBe(true);
      expect(result["2026-03-10"][1].preferred).toBe(true);
      expect(result["2026-03-10"][2].preferred).toBe(false);
      expect(result["2026-03-10"][3].preferred).toBe(false);
    });
  });

  describe("auto mode - prefer afternoons", () => {
    const config = { mode: "auto" as const, auto: { preferTimeOfDay: "afternoon" as const } };

    it("marks afternoon slots as preferred", () => {
      const slots = {
        "2026-03-10": [{ time: "2026-03-10T12:00:00.000Z" }, { time: "2026-03-10T14:00:00.000Z" }],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(result["2026-03-10"][0].preferred).toBe(true);
      expect(result["2026-03-10"][1].preferred).toBe(true);
    });

    it("marks morning slots as not preferred", () => {
      const slots = {
        "2026-03-10": [{ time: "2026-03-10T08:00:00.000Z" }, { time: "2026-03-10T10:00:00.000Z" }],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(result["2026-03-10"][0].preferred).toBe(false);
      expect(result["2026-03-10"][1].preferred).toBe(false);
    });

    it("converts timezone before determining morning/afternoon", () => {
      const slots = {
        "2026-03-10": [{ time: "2026-03-10T06:00:00.000Z" }],
      };

      const resultUTC = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });
      expect(resultUTC["2026-03-10"][0].preferred).toBe(false);

      const resultTokyo = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "Asia/Tokyo",
        eventLength: 30,
      });
      expect(resultTokyo["2026-03-10"][0].preferred).toBe(true);
    });
  });

  describe("manual mode - day-of-week ranges", () => {
    it("marks slots on matching day within time range as preferred", () => {
      // 2026-03-10 is a Tuesday (day=2)
      const config = {
        mode: "manual" as const,
        manual: { ranges: [{ day: 2, startTime: "09:00", endTime: "12:00" }] },
      };
      const slots = {
        "2026-03-10": [
          { time: "2026-03-10T09:00:00.000Z" },
          { time: "2026-03-10T09:30:00.000Z" },
          { time: "2026-03-10T11:00:00.000Z" },
        ],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(result["2026-03-10"][0].preferred).toBe(true);
      expect(result["2026-03-10"][1].preferred).toBe(true);
      expect(result["2026-03-10"][2].preferred).toBe(true);
    });

    it("marks slots outside time range as not preferred", () => {
      // 2026-03-10 is a Tuesday (day=2)
      const config = {
        mode: "manual" as const,
        manual: { ranges: [{ day: 2, startTime: "09:00", endTime: "12:00" }] },
      };
      const slots = {
        "2026-03-10": [
          { time: "2026-03-10T08:00:00.000Z" },
          { time: "2026-03-10T13:00:00.000Z" },
          { time: "2026-03-10T15:00:00.000Z" },
        ],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(result["2026-03-10"][0].preferred).toBe(false);
      expect(result["2026-03-10"][1].preferred).toBe(false);
      expect(result["2026-03-10"][2].preferred).toBe(false);
    });

    it("marks slots on non-matching day as not preferred", () => {
      // 2026-03-10 is Tuesday (day=2), but range is for Monday (day=1)
      const config = {
        mode: "manual" as const,
        manual: { ranges: [{ day: 1, startTime: "09:00", endTime: "17:00" }] },
      };
      const slots = {
        "2026-03-10": [{ time: "2026-03-10T10:00:00.000Z" }, { time: "2026-03-10T14:00:00.000Z" }],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(result["2026-03-10"][0].preferred).toBe(false);
      expect(result["2026-03-10"][1].preferred).toBe(false);
    });

    it("handles slot that extends beyond the preferred range end", () => {
      // 2026-03-10 is Tuesday (day=2)
      const config = {
        mode: "manual" as const,
        manual: { ranges: [{ day: 2, startTime: "09:00", endTime: "10:00" }] },
      };
      const slots = {
        "2026-03-10": [{ time: "2026-03-10T09:45:00.000Z" }],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(result["2026-03-10"][0].preferred).toBe(false);
    });

    it("handles multiple ranges on the same day", () => {
      // 2026-03-10 is Tuesday (day=2)
      const config = {
        mode: "manual" as const,
        manual: {
          ranges: [
            { day: 2, startTime: "09:00", endTime: "10:00" },
            { day: 2, startTime: "14:00", endTime: "16:00" },
          ],
        },
      };
      const slots = {
        "2026-03-10": [
          { time: "2026-03-10T09:00:00.000Z" },
          { time: "2026-03-10T11:00:00.000Z" },
          { time: "2026-03-10T14:30:00.000Z" },
        ],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(result["2026-03-10"][0].preferred).toBe(true);
      expect(result["2026-03-10"][1].preferred).toBe(false);
      expect(result["2026-03-10"][2].preferred).toBe(true);
    });

    it("returns slots with preferred=false when ranges array is empty", () => {
      const config = {
        mode: "manual" as const,
        manual: { ranges: [] },
      };
      const slots = {
        "2026-03-10": [{ time: "2026-03-10T09:00:00.000Z" }],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(result["2026-03-10"][0]).toEqual({ time: "2026-03-10T09:00:00.000Z" });
      expect(result["2026-03-10"][0]).not.toHaveProperty("preferred");
    });

    it("uses eventLength to compute slot end for boundary check", () => {
      // 2026-03-10 is Tuesday (day=2)
      const config = {
        mode: "manual" as const,
        manual: { ranges: [{ day: 2, startTime: "09:00", endTime: "10:00" }] },
      };
      const slots = {
        "2026-03-10": [{ time: "2026-03-10T09:00:00.000Z" }],
      };

      const result30 = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });
      expect(result30["2026-03-10"][0].preferred).toBe(true);

      const result90 = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 90,
      });
      expect(result90["2026-03-10"][0].preferred).toBe(false);
    });

    it("marks slot at exact range boundary as preferred", () => {
      // 2026-03-10 is Tuesday (day=2)
      const config = {
        mode: "manual" as const,
        manual: { ranges: [{ day: 2, startTime: "09:00", endTime: "09:30" }] },
      };
      const slots = {
        "2026-03-10": [{ time: "2026-03-10T09:00:00.000Z" }],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(result["2026-03-10"][0].preferred).toBe(true);
    });

    it("handles timezone conversion for day-of-week matching", () => {
      // 2026-03-10T22:00:00Z in UTC is Tuesday, but in Asia/Tokyo (+9) it's 2026-03-11T07:00 which is Wednesday (day=3)
      const configWed = {
        mode: "manual" as const,
        manual: { ranges: [{ day: 3, startTime: "07:00", endTime: "12:00" }] },
      };
      const slots = {
        "2026-03-10": [{ time: "2026-03-10T22:00:00.000Z" }],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config: configWed,
        timeZone: "Asia/Tokyo",
        eventLength: 30,
      });

      expect(result["2026-03-10"][0].preferred).toBe(true);
    });

    it("handles ranges across multiple days of the week", () => {
      // 2026-03-10 is Tuesday (day=2), 2026-03-11 is Wednesday (day=3)
      const config = {
        mode: "manual" as const,
        manual: {
          ranges: [
            { day: 2, startTime: "09:00", endTime: "12:00" },
            { day: 3, startTime: "14:00", endTime: "17:00" },
          ],
        },
      };
      const slots = {
        "2026-03-10": [{ time: "2026-03-10T10:00:00.000Z" }, { time: "2026-03-10T15:00:00.000Z" }],
        "2026-03-11": [{ time: "2026-03-11T10:00:00.000Z" }, { time: "2026-03-11T15:00:00.000Z" }],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(result["2026-03-10"][0].preferred).toBe(true);
      expect(result["2026-03-10"][1].preferred).toBe(false);
      expect(result["2026-03-11"][0].preferred).toBe(false);
      expect(result["2026-03-11"][1].preferred).toBe(true);
    });
  });

  describe("multiple dates", () => {
    it("processes slots across multiple dates", () => {
      const config = { mode: "auto" as const, auto: { preferTimeOfDay: "morning" as const } };

      const slots = {
        "2026-03-10": [{ time: "2026-03-10T08:00:00.000Z" }, { time: "2026-03-10T14:00:00.000Z" }],
        "2026-03-11": [{ time: "2026-03-11T10:00:00.000Z" }, { time: "2026-03-11T16:00:00.000Z" }],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(result["2026-03-10"][0].preferred).toBe(true);
      expect(result["2026-03-10"][1].preferred).toBe(false);
      expect(result["2026-03-11"][0].preferred).toBe(true);
      expect(result["2026-03-11"][1].preferred).toBe(false);
    });
  });

  describe("preserves existing slot properties", () => {
    it("keeps attendees, bookingUid, and other fields intact", () => {
      const config = { mode: "auto" as const, auto: { preferTimeOfDay: "morning" as const } };

      const slots = {
        "2026-03-10": [{ time: "2026-03-10T08:00:00.000Z", attendees: 3, bookingUid: "abc-123" }],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(result["2026-03-10"][0]).toEqual({
        time: "2026-03-10T08:00:00.000Z",
        attendees: 3,
        bookingUid: "abc-123",
        preferred: true,
      });
    });
  });

  describe("auto mode - batch meetings together", () => {
    const config = { mode: "auto" as const, auto: { batchMeetings: true } };

    it("marks slots adjacent to busy times as preferred", () => {
      const slots = {
        "2026-03-10": [
          { time: "2026-03-10T09:00:00.000Z" },
          { time: "2026-03-10T09:30:00.000Z" },
          { time: "2026-03-10T10:00:00.000Z" },
          { time: "2026-03-10T14:00:00.000Z" },
        ],
      };
      const busyTimes = [
        { start: new Date("2026-03-10T10:00:00.000Z"), end: new Date("2026-03-10T10:30:00.000Z") },
      ];

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
        busyTimes,
      });

      expect(result["2026-03-10"][0].preferred).toBe(false);
      expect(result["2026-03-10"][1].preferred).toBe(true);
      expect(result["2026-03-10"][2].preferred).toBe(true);
      expect(result["2026-03-10"][3].preferred).toBe(false);
    });

    it("marks slots before a busy time as preferred when adjacent", () => {
      const slots = {
        "2026-03-10": [{ time: "2026-03-10T09:00:00.000Z" }, { time: "2026-03-10T09:30:00.000Z" }],
      };
      const busyTimes = [
        { start: new Date("2026-03-10T10:00:00.000Z"), end: new Date("2026-03-10T11:00:00.000Z") },
      ];

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
        busyTimes,
      });

      expect(result["2026-03-10"][0].preferred).toBe(false);
      expect(result["2026-03-10"][1].preferred).toBe(true);
    });

    it("marks slots after a busy time as preferred when adjacent", () => {
      const slots = {
        "2026-03-10": [{ time: "2026-03-10T11:00:00.000Z" }, { time: "2026-03-10T11:30:00.000Z" }],
      };
      const busyTimes = [
        { start: new Date("2026-03-10T10:00:00.000Z"), end: new Date("2026-03-10T11:00:00.000Z") },
      ];

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
        busyTimes,
      });

      expect(result["2026-03-10"][0].preferred).toBe(true);
      expect(result["2026-03-10"][1].preferred).toBe(false);
    });

    it("does not mark slots far from busy times as preferred", () => {
      const slots = {
        "2026-03-10": [{ time: "2026-03-10T08:00:00.000Z" }, { time: "2026-03-10T15:00:00.000Z" }],
      };
      const busyTimes = [
        { start: new Date("2026-03-10T11:00:00.000Z"), end: new Date("2026-03-10T12:00:00.000Z") },
      ];

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
        busyTimes,
      });

      expect(result["2026-03-10"][0].preferred).toBe(false);
      expect(result["2026-03-10"][1].preferred).toBe(false);
    });

    it("handles multiple busy times", () => {
      const slots = {
        "2026-03-10": [
          { time: "2026-03-10T09:30:00.000Z" },
          { time: "2026-03-10T11:00:00.000Z" },
          { time: "2026-03-10T14:30:00.000Z" },
          { time: "2026-03-10T16:00:00.000Z" },
        ],
      };
      const busyTimes = [
        { start: new Date("2026-03-10T10:00:00.000Z"), end: new Date("2026-03-10T11:00:00.000Z") },
        { start: new Date("2026-03-10T15:00:00.000Z"), end: new Date("2026-03-10T15:30:00.000Z") },
      ];

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
        busyTimes,
      });

      expect(result["2026-03-10"][0].preferred).toBe(true);
      expect(result["2026-03-10"][1].preferred).toBe(true);
      expect(result["2026-03-10"][2].preferred).toBe(true);
      expect(result["2026-03-10"][3].preferred).toBe(false);
    });

    it("handles no busy times gracefully", () => {
      const slots = {
        "2026-03-10": [{ time: "2026-03-10T09:00:00.000Z" }],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
        busyTimes: [],
      });

      expect(result["2026-03-10"][0]).toEqual({ time: "2026-03-10T09:00:00.000Z" });
      expect(result["2026-03-10"][0]).not.toHaveProperty("preferred");
    });

    it("handles longer event durations for adjacency", () => {
      const slots = {
        "2026-03-10": [{ time: "2026-03-10T08:00:00.000Z" }, { time: "2026-03-10T09:00:00.000Z" }],
      };
      const busyTimes = [
        { start: new Date("2026-03-10T10:00:00.000Z"), end: new Date("2026-03-10T11:00:00.000Z") },
      ];

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 60,
        busyTimes,
      });

      expect(result["2026-03-10"][0].preferred).toBe(false);
      expect(result["2026-03-10"][1].preferred).toBe(true);
    });
  });

  describe("auto mode - batch meetings combined with time-of-day", () => {
    it("requires both conditions when both are active", () => {
      const config = {
        mode: "auto" as const,
        auto: { preferTimeOfDay: "morning" as const, batchMeetings: true },
      };
      const slots = {
        "2026-03-10": [
          { time: "2026-03-10T09:30:00.000Z" },
          { time: "2026-03-10T14:30:00.000Z" },
          { time: "2026-03-10T08:00:00.000Z" },
        ],
      };
      const busyTimes = [
        { start: new Date("2026-03-10T10:00:00.000Z"), end: new Date("2026-03-10T11:00:00.000Z") },
        { start: new Date("2026-03-10T15:00:00.000Z"), end: new Date("2026-03-10T15:30:00.000Z") },
      ];

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
        busyTimes,
      });

      expect(result["2026-03-10"][0].preferred).toBe(true);
      expect(result["2026-03-10"][1].preferred).toBe(false);
      expect(result["2026-03-10"][2].preferred).toBe(false);
    });

    it("marks afternoon adjacent slots as not preferred when preferring mornings", () => {
      const config = {
        mode: "auto" as const,
        auto: { preferTimeOfDay: "morning" as const, batchMeetings: true },
      };
      const slots = {
        "2026-03-10": [{ time: "2026-03-10T14:30:00.000Z" }],
      };
      const busyTimes = [
        { start: new Date("2026-03-10T15:00:00.000Z"), end: new Date("2026-03-10T16:00:00.000Z") },
      ];

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
        busyTimes,
      });

      expect(result["2026-03-10"][0].preferred).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty slots object", () => {
      const config = { mode: "auto" as const, auto: { preferTimeOfDay: "morning" as const } };

      const result = applyPreferredFlagToSlots({
        slots: {},
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(result).toEqual({});
    });

    it("handles date with empty slots array", () => {
      const config = { mode: "auto" as const, auto: { preferTimeOfDay: "morning" as const } };

      const result = applyPreferredFlagToSlots({
        slots: { "2026-03-10": [] },
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(result["2026-03-10"]).toEqual([]);
    });

    it("auto mode without preferTimeOfDay returns slots unchanged", () => {
      const config = { mode: "auto" as const, auto: {} };

      const slots = {
        "2026-03-10": [{ time: "2026-03-10T08:00:00.000Z" }],
      };

      const result = applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(result["2026-03-10"][0]).toEqual({ time: "2026-03-10T08:00:00.000Z" });
      expect(result["2026-03-10"][0]).not.toHaveProperty("preferred");
    });

    it("does not mutate the original slots object", () => {
      const config = { mode: "auto" as const, auto: { preferTimeOfDay: "morning" as const } };
      const originalSlot = { time: "2026-03-10T08:00:00.000Z" };
      const slots = { "2026-03-10": [originalSlot] };

      applyPreferredFlagToSlots({
        slots,
        config,
        timeZone: "UTC",
        eventLength: 30,
      });

      expect(originalSlot).not.toHaveProperty("preferred");
      expect(slots["2026-03-10"][0]).not.toHaveProperty("preferred");
    });
  });
});
