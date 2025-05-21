import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";

import { EventsInsights } from "../events";

describe("EventsInsights", () => {
  describe("getDateRanges", () => {
    it("should handle daily ranges", () => {
      const startDate = dayjs.utc("2025-05-01");
      const endDate = dayjs.utc("2025-05-03");
      const ranges = EventsInsights.getDateRanges(startDate, endDate, "day");

      expect(ranges).toHaveLength(3);
      expect(ranges[0]).toEqual({
        startDate: "2025-05-01T00:00:00.000Z",
        endDate: "2025-05-01T23:59:59.999Z",
        formattedDate: startDate.format("ll"),
      });
      expect(ranges[2]).toEqual({
        startDate: "2025-05-03T00:00:00.000Z",
        endDate: "2025-05-03T23:59:59.999Z",
        formattedDate: endDate.format("ll"),
      });
    });

    it("should handle weekly ranges starting mid-week", () => {
      // May 1, 2025 is a Thursday
      const startDate = dayjs.utc("2025-05-01");
      const endDate = dayjs.utc("2025-05-25");
      const ranges = EventsInsights.getDateRanges(startDate, endDate, "week");

      expect(ranges).toHaveLength(4);
      // First range should start from May 1st (not from Monday April 28)
      expect(ranges[0]).toEqual({
        startDate: "2025-05-01T00:00:00.000Z",
        endDate: "2025-05-04T23:59:59.999Z",
        formattedDate: dayjs.utc("2025-05-01").format("ll"),
      });
      // Second range should be a full week Mon-Sun
      expect(ranges[1]).toEqual({
        startDate: "2025-05-05T00:00:00.000Z",
        endDate: "2025-05-11T23:59:59.999Z",
        formattedDate: dayjs.utc("2025-05-05").format("ll"),
      });
      // Last range should end on May 25th (not complete the week)
      expect(ranges[3]).toEqual({
        startDate: "2025-05-19T00:00:00.000Z",
        endDate: "2025-05-25T23:59:59.999Z",
        formattedDate: dayjs.utc("2025-05-19").format("ll"),
      });
    });

    it("should handle monthly ranges", () => {
      const startDate = dayjs.utc("2025-05-15");
      const endDate = dayjs.utc("2025-07-15");
      const ranges = EventsInsights.getDateRanges(startDate, endDate, "month");

      expect(ranges).toHaveLength(3);
      // First range should start from May 15th
      expect(ranges[0]).toEqual({
        startDate: "2025-05-15T00:00:00.000Z",
        endDate: "2025-05-31T23:59:59.999Z",
        formattedDate: "May 2025",
      });
      // Middle month should be complete
      expect(ranges[1]).toEqual({
        startDate: "2025-06-01T00:00:00.000Z",
        endDate: "2025-06-30T23:59:59.999Z",
        formattedDate: "Jun 2025",
      });
      // Last range should end on July 15th
      expect(ranges[2]).toEqual({
        startDate: "2025-07-01T00:00:00.000Z",
        endDate: "2025-07-15T23:59:59.999Z",
        formattedDate: "Jul 2025",
      });
    });

    it("should handle yearly ranges", () => {
      const startDate = dayjs.utc("2025-06-15");
      const endDate = dayjs.utc("2027-03-15");
      const ranges = EventsInsights.getDateRanges(startDate, endDate, "year");

      expect(ranges).toHaveLength(3);
      // First range should start from June 15th 2025
      expect(ranges[0]).toEqual({
        startDate: "2025-06-15T00:00:00.000Z",
        endDate: "2025-12-31T23:59:59.999Z",
        formattedDate: "2025",
      });
      // Middle year should be complete
      expect(ranges[1]).toEqual({
        startDate: "2026-01-01T00:00:00.000Z",
        endDate: "2026-12-31T23:59:59.999Z",
        formattedDate: "2026",
      });
      // Last range should end on March 15th 2027
      expect(ranges[2]).toEqual({
        startDate: "2027-01-01T00:00:00.000Z",
        endDate: "2027-03-15T23:59:59.999Z",
        formattedDate: "2027",
      });
    });

    it("should handle yearly ranges within the same year", () => {
      const startDate = dayjs.utc("2025-03-15");
      const endDate = dayjs.utc("2025-09-20");
      const ranges = EventsInsights.getDateRanges(startDate, endDate, "year");

      expect(ranges).toHaveLength(1);
      expect(ranges[0]).toEqual({
        startDate: "2025-03-15T00:00:00.000Z",
        endDate: "2025-09-20T23:59:59.999Z",
        formattedDate: "2025",
      });
    });

    it("should handle same day ranges", () => {
      const date = dayjs.utc("2025-05-01");
      const ranges = EventsInsights.getDateRanges(date, date, "day");

      expect(ranges).toHaveLength(1);
      expect(ranges[0]).toEqual({
        startDate: "2025-05-01T00:00:00.000Z",
        endDate: "2025-05-01T23:59:59.999Z",
        formattedDate: date.format("ll"),
      });
    });

    it("should handle ranges less than a week", () => {
      const startDate = dayjs.utc("2025-05-01"); // Thursday
      const endDate = dayjs.utc("2025-05-03"); // Saturday
      const ranges = EventsInsights.getDateRanges(startDate, endDate, "week");

      expect(ranges).toHaveLength(1);
      expect(ranges[0]).toEqual({
        startDate: "2025-05-01T00:00:00.000Z",
        endDate: "2025-05-03T23:59:59.999Z",
        formattedDate: startDate.format("ll"),
      });
    });

    it("should return empty array for invalid timeView", () => {
      const startDate = dayjs.utc("2025-05-01");
      const endDate = dayjs.utc("2025-05-03");
      // @ts-expect-error - Testing invalid timeView value
      const ranges = EventsInsights.getDateRanges(startDate, endDate, "invalid");

      expect(ranges).toHaveLength(0);
      expect(ranges).toEqual([]);
    });
  });
});
