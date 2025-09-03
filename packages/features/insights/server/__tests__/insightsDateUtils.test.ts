import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";

import { getTimeView, getDateRanges, formatPeriod } from "../insightsDateUtils";

describe("insightsDateUtils", () => {
  describe("getDateRanges", () => {
    describe("UTC timezone", () => {
      const timeZone = "UTC";

      it("should handle daily ranges", () => {
        const startDate = "2025-05-01T00:00:00.000Z"; // Beginning of May 1st UTC
        const endDate = "2025-05-03T23:59:59.999Z"; // End of May 3rd UTC

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "day",
          weekStart: "Sunday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        expect(ranges).toHaveLength(3);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-01T00:00:00.000Z",
          endDate: "2025-05-01T23:59:59.999Z",
          formattedDate: "May 1",
          formattedDateFull: "May 1",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-05-02T00:00:00.000Z",
          endDate: "2025-05-02T23:59:59.999Z",
          formattedDate: "2",
          formattedDateFull: "May 2",
        });
        expect(ranges[2]).toEqual({
          startDate: "2025-05-03T00:00:00.000Z",
          endDate: "2025-05-03T23:59:59.999Z",
          formattedDate: "3",
          formattedDateFull: "May 3",
        });
      });

      it("should handle weekly ranges starting mid-week", () => {
        const startDate = "2025-05-01T00:00:00.000Z"; // Thursday
        const endDate = "2025-05-25T23:59:59.999Z";

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "week",
          weekStart: "Sunday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        expect(ranges).toHaveLength(5);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-01T00:00:00.000Z",
          endDate: "2025-05-03T23:59:59.999Z",
          formattedDate: "May 1 - 3",
          formattedDateFull: "May 1 - May 3",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-05-04T00:00:00.000Z",
          endDate: "2025-05-10T23:59:59.999Z",
          formattedDate: "May 4 - 10",
          formattedDateFull: "May 4 - May 10",
        });
        expect(ranges[2]).toEqual({
          startDate: "2025-05-11T00:00:00.000Z",
          endDate: "2025-05-17T23:59:59.999Z",
          formattedDate: "May 11 - 17",
          formattedDateFull: "May 11 - May 17",
        });
        expect(ranges[3]).toEqual({
          startDate: "2025-05-18T00:00:00.000Z",
          endDate: "2025-05-24T23:59:59.999Z",
          formattedDate: "May 18 - 24",
          formattedDateFull: "May 18 - May 24",
        });
        expect(ranges[4]).toEqual({
          startDate: "2025-05-25T00:00:00.000Z",
          endDate: "2025-05-25T23:59:59.999Z",
          formattedDate: "May 25 - 25",
          formattedDateFull: "May 25 - May 25",
        });
      });

      it("should handle monthly ranges", () => {
        const startDate = "2025-05-15T00:00:00.000Z";
        const endDate = "2025-07-15T23:59:59.999Z";

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "month",
          weekStart: "Sunday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        expect(ranges).toHaveLength(3);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-15T00:00:00.000Z",
          endDate: "2025-05-31T23:59:59.999Z",
          formattedDate: "May",
          formattedDateFull: "May",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-06-01T00:00:00.000Z",
          endDate: "2025-06-30T23:59:59.999Z",
          formattedDate: "Jun",
          formattedDateFull: "Jun",
        });
        expect(ranges[2]).toEqual({
          startDate: "2025-07-01T00:00:00.000Z",
          endDate: "2025-07-15T23:59:59.999Z",
          formattedDate: "Jul",
          formattedDateFull: "Jul",
        });
      });

      it("should handle yearly ranges", () => {
        const startDate = "2025-06-15T00:00:00.000Z";
        const endDate = "2027-03-15T23:59:59.999Z";

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "year",
          weekStart: "Sunday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        expect(ranges).toHaveLength(3);
        expect(ranges[0]).toEqual({
          startDate: "2025-06-15T00:00:00.000Z",
          endDate: "2025-12-31T23:59:59.999Z",
          formattedDate: "2025",
          formattedDateFull: "2025",
        });
        expect(ranges[1]).toEqual({
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: "2026-12-31T23:59:59.999Z",
          formattedDate: "2026",
          formattedDateFull: "2026",
        });
        expect(ranges[2]).toEqual({
          startDate: "2027-01-01T00:00:00.000Z",
          endDate: "2027-03-15T23:59:59.999Z",
          formattedDate: "2027",
          formattedDateFull: "2027",
        });
      });

      it("should handle same day ranges", () => {
        const startDate = "2025-05-01T00:00:00.000Z";
        const endDate = "2025-05-01T23:59:59.999Z";

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "day",
          weekStart: "Sunday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        expect(ranges).toHaveLength(1);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-01T00:00:00.000Z",
          endDate: "2025-05-01T23:59:59.999Z",
          formattedDate: "May 1",
          formattedDateFull: "May 1",
        });
      });
    });

    describe("Europe/Paris timezone", () => {
      const timeZone = "Europe/Paris";

      it("should handle daily ranges across DST", () => {
        const startDate = "2025-03-29T23:00:00.000Z"; // March 30th 00:00 Paris time
        const endDate = "2025-03-31T21:59:59.999Z"; // March 31st 23:59:59 Paris time

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "day",
          weekStart: "Sunday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        expect(ranges).toHaveLength(2);
        // DST begins on Sunday, March 30, 2025, at 3:00 AM local time
        expect(ranges[0]).toEqual({
          startDate: "2025-03-29T23:00:00.000Z", // March 30th 00:00 Paris time
          endDate: "2025-03-30T21:59:59.999Z", // March 30th 23:59:59 Paris time
          formattedDate: "Mar 30",
          formattedDateFull: "Mar 30",
        });
        expect(new Date(ranges[0].endDate).getTime() - new Date(ranges[0].startDate).getTime()).toBeLessThan(
          23 * 60 * 60 * 1000
        ); // 1 hour is skipped
        expect(ranges[1]).toEqual({
          startDate: "2025-03-30T22:00:00.000Z", // March 31st 00:00 Paris time
          endDate: "2025-03-31T21:59:59.999Z", // March 31st 23:59:59 Paris time
          formattedDate: "31",
          formattedDateFull: "Mar 31",
        });
      });

      it("should handle weekly ranges", () => {
        const startDate = "2025-05-15T22:00:00.000Z"; // May 16th 00:00 Paris time
        const endDate = "2025-05-29T21:59:59.999Z"; // May 29th 23:59:59 Paris time

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "week",
          weekStart: "Sunday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        expect(ranges).toHaveLength(3);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-15T22:00:00.000Z",
          endDate: "2025-05-17T21:59:59.999Z",
          formattedDate: "May 16 - 17",
          formattedDateFull: "May 16 - May 17",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-05-17T22:00:00.000Z",
          endDate: "2025-05-24T21:59:59.999Z",
          formattedDate: "May 18 - 24",
          formattedDateFull: "May 18 - May 24",
        });
        expect(ranges[2]).toEqual({
          startDate: "2025-05-24T22:00:00.000Z",
          endDate: "2025-05-29T21:59:59.999Z",
          formattedDate: "May 25 - 29",
          formattedDateFull: "May 25 - May 29",
        });
      });

      it("should handle monthly ranges", () => {
        const startDate = "2025-05-31T22:00:00.000Z"; // June 1st 00:00 Paris time
        const endDate = "2025-07-31T21:59:59.999Z"; // July 31st 23:59:59 Paris time

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "month",
          weekStart: "Sunday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        expect(ranges).toHaveLength(2);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-31T22:00:00.000Z",
          endDate: "2025-06-30T21:59:59.999Z",
          formattedDate: "Jun",
          formattedDateFull: "Jun",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-06-30T22:00:00.000Z",
          endDate: "2025-07-31T21:59:59.999Z",
          formattedDate: "Jul",
          formattedDateFull: "Jul",
        });
      });
    });

    describe("Asia/Seoul timezone", () => {
      const timeZone = "Asia/Seoul";

      it("should handle daily ranges", () => {
        const startDate = "2025-05-14T15:00:00.000Z"; // May 15th 00:00 Seoul time
        const endDate = "2025-05-16T14:59:59.999Z"; // May 16th 23:59:59 Seoul time

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "day",
          weekStart: "Sunday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        expect(ranges).toHaveLength(2);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-14T15:00:00.000Z",
          endDate: "2025-05-15T14:59:59.999Z",
          formattedDate: "May 15",
          formattedDateFull: "May 15",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-05-15T15:00:00.000Z",
          endDate: "2025-05-16T14:59:59.999Z",
          formattedDate: "16",
          formattedDateFull: "May 16",
        });
      });

      it("should handle weekly ranges", () => {
        const startDate = "2025-05-11T15:00:00.000Z"; // May 12th 00:00 Seoul time (Monday)
        const endDate = "2025-05-25T14:59:59.999Z"; // May 25th 23:59:59 Seoul time (Sunday)

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "week",
          weekStart: "Sunday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        expect(ranges).toHaveLength(3);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-11T15:00:00.000Z",
          endDate: "2025-05-17T14:59:59.999Z",
          formattedDate: "May 12 - 17",
          formattedDateFull: "May 12 - May 17",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-05-17T15:00:00.000Z",
          endDate: "2025-05-24T14:59:59.999Z",
          formattedDate: "May 18 - 24",
          formattedDateFull: "May 18 - May 24",
        });
        expect(ranges[2]).toEqual({
          startDate: "2025-05-24T15:00:00.000Z",
          endDate: "2025-05-25T14:59:59.999Z",
          formattedDate: "May 25 - 25",
          formattedDateFull: "May 25 - May 25",
        });
      });

      it("should handle monthly ranges", () => {
        const startDate = "2025-04-30T15:00:00.000Z"; // May 1st 00:00 Seoul time
        const endDate = "2025-06-30T14:59:59.999Z"; // June 30th 23:59:59 Seoul time

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "month",
          weekStart: "Sunday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        expect(ranges).toHaveLength(2);
        expect(ranges[0]).toEqual({
          startDate: "2025-04-30T15:00:00.000Z",
          endDate: "2025-05-31T14:59:59.999Z",
          formattedDate: "May",
          formattedDateFull: "May",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-05-31T15:00:00.000Z",
          endDate: "2025-06-30T14:59:59.999Z",
          formattedDate: "Jun",
          formattedDateFull: "Jun",
        });
      });
    });

    it("should return empty array for invalid timeView", () => {
      const startDate = "2025-05-01T00:00:00.000Z";
      const endDate = "2025-05-03T23:59:59.999Z";
      const timeZone = "UTC";

      const ranges = getDateRanges({
        startDate,
        endDate,
        timeZone,
        weekStart: "Sunday",
        // @ts-expect-error - Testing invalid timeView value
        timeView: "invalid",
      });

      if (!ranges) {
        throw new Error("Expected ranges to be defined");
      }

      expect(ranges).toEqual([]);
    });

    describe("Week start variations", () => {
      const timeZone = "UTC";

      it("should handle weekly ranges with Monday start", () => {
        const startDate = "2025-05-01T00:00:00.000Z"; // Thursday
        const endDate = "2025-05-14T23:59:59.999Z"; // Wednesday

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "week",
          weekStart: "Monday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        expect(ranges).toHaveLength(3);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-01T00:00:00.000Z",
          endDate: "2025-05-04T23:59:59.999Z",
          formattedDate: "May 1 - 4",
          formattedDateFull: "May 1 - May 4",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-05-05T00:00:00.000Z",
          endDate: "2025-05-11T23:59:59.999Z",
          formattedDate: "May 5 - 11",
          formattedDateFull: "May 5 - May 11",
        });
        expect(ranges[2]).toEqual({
          startDate: "2025-05-12T00:00:00.000Z",
          endDate: "2025-05-14T23:59:59.999Z",
          formattedDate: "May 12 - 14",
          formattedDateFull: "May 12 - May 14",
        });
      });

      it("should handle weekly ranges with Tuesday start", () => {
        const startDate = "2025-05-01T00:00:00.000Z"; // Thursday
        const endDate = "2025-05-14T23:59:59.999Z"; // Wednesday

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "week",
          weekStart: "Tuesday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        expect(ranges).toHaveLength(3);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-01T00:00:00.000Z",
          endDate: "2025-05-05T23:59:59.999Z",
          formattedDate: "May 1 - 5",
          formattedDateFull: "May 1 - May 5",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-05-06T00:00:00.000Z",
          endDate: "2025-05-12T23:59:59.999Z",
          formattedDate: "May 6 - 12",
          formattedDateFull: "May 6 - May 12",
        });
        expect(ranges[2]).toEqual({
          startDate: "2025-05-13T00:00:00.000Z",
          endDate: "2025-05-14T23:59:59.999Z",
          formattedDate: "May 13 - 14",
          formattedDateFull: "May 13 - May 14",
        });
      });
    });
  });

  describe("getTimeView", () => {
    it("should return 'day' for ranges up to 7 days", () => {
      const result = getTimeView("2025-05-01T00:00:00.000Z", "2025-05-07T23:59:59.999Z");
      expect(result).toBe("day");
    });

    it("should return 'week' for ranges from 31 to 90 days", () => {
      const result = getTimeView("2025-05-01T00:00:00.000Z", "2025-06-15T23:59:59.999Z");
      expect(result).toBe("week");
    });

    it("should return 'month' for ranges from 91 to 365 days", () => {
      const result = getTimeView("2025-01-01T00:00:00.000Z", "2025-04-15T23:59:59.999Z");
      expect(result).toBe("month");
    });

    it("should return 'year' for ranges over 365 days", () => {
      const result = getTimeView("2025-01-01T00:00:00.000Z", "2026-01-02T23:59:59.999Z");
      expect(result).toBe("year");
    });

    it("should handle edge cases", () => {
      const result = getTimeView("2025-05-01T00:00:00.000Z", "2025-05-01T23:59:59.999Z");
      expect(result).toBe("day");
    });

    it("should handle same start and end date", () => {
      const result = getTimeView("2025-05-01T00:00:00.000Z", "2025-05-01T00:00:00.000Z");
      expect(result).toBe("day");
    });

    it("should handle 90 day boundary", () => {
      const result = getTimeView("2025-01-01T00:00:00.000Z", "2025-03-31T23:59:59.999Z");
      expect(result).toBe("week");
    });

    it("should handle 365 day boundary", () => {
      const result = getTimeView("2025-01-01T00:00:00.000Z", "2025-12-31T23:59:59.999Z");
      expect(result).toBe("month");
    });
  });

  describe("formatPeriod", () => {
    it("should format daily periods correctly", () => {
      const result = formatPeriod({
        start: dayjs("2025-05-01T00:00:00.000Z"),
        end: dayjs("2025-05-01T23:59:59.999Z"),
        timeView: "day",
        wholeStart: dayjs("2025-05-01T00:00:00.000Z"),
        wholeEnd: dayjs("2025-05-03T23:59:59.999Z"),
      });
      expect(result).toBe("May 1");
    });

    it("should format subsequent daily periods with just the day", () => {
      const result = formatPeriod({
        start: dayjs("2025-05-02T00:00:00.000Z"),
        end: dayjs("2025-05-02T23:59:59.999Z"),
        timeView: "day",
        wholeStart: dayjs("2025-05-01T00:00:00.000Z"),
        wholeEnd: dayjs("2025-05-03T23:59:59.999Z"),
      });
      expect(result).toBe("2");
    });

    it("should format weekly periods correctly", () => {
      const result = formatPeriod({
        start: dayjs("2025-05-01T00:00:00.000Z"),
        end: dayjs("2025-05-07T23:59:59.999Z"),
        timeView: "week",
        wholeStart: dayjs("2025-05-01T00:00:00.000Z"),
        wholeEnd: dayjs("2025-05-14T23:59:59.999Z"),
      });
      expect(result).toBe("May 1 - 7");
    });

    it("should format monthly periods correctly", () => {
      const result = formatPeriod({
        start: dayjs("2025-05-01T00:00:00.000Z"),
        end: dayjs("2025-05-31T23:59:59.999Z"),
        timeView: "month",
        wholeStart: dayjs("2025-05-01T00:00:00.000Z"),
        wholeEnd: dayjs("2025-07-31T23:59:59.999Z"),
      });
      expect(result).toBe("May");
    });

    it("should format yearly periods correctly", () => {
      const result = formatPeriod({
        start: dayjs("2025-01-01T00:00:00.000Z"),
        end: dayjs("2025-12-31T23:59:59.999Z"),
        timeView: "year",
        wholeStart: dayjs("2025-01-01T00:00:00.000Z"),
        wholeEnd: dayjs("2027-12-31T23:59:59.999Z"),
      });
      expect(result).toBe("2025");
    });

    it("should handle cross-month weekly periods", () => {
      const result = formatPeriod({
        start: dayjs("2025-05-29T00:00:00.000Z"),
        end: dayjs("2025-06-04T23:59:59.999Z"),
        timeView: "week",
        wholeStart: dayjs("2025-05-01T00:00:00.000Z"),
        wholeEnd: dayjs("2025-06-30T23:59:59.999Z"),
      });
      expect(result).toBe("May 29 - Jun 4");
    });

    it("should handle cross-year periods", () => {
      const resultWithSameYear = formatPeriod({
        start: dayjs("2025-12-01T00:00:00.000Z"),
        end: dayjs("2025-12-31T23:59:59.999Z"),
        timeView: "month",
        wholeStart: dayjs("2025-01-01T00:00:00.000Z"),
        wholeEnd: dayjs("2025-12-31T23:59:59.999Z"),
      });
      expect(resultWithSameYear).toBe("Dec");

      const resultWithDifferentYears = formatPeriod({
        start: dayjs("2025-12-01T00:00:00.000Z"),
        end: dayjs("2025-12-31T23:59:59.999Z"),
        timeView: "month",
        wholeStart: dayjs("2024-01-01T00:00:00.000Z"),
        wholeEnd: dayjs("2025-12-31T23:59:59.999Z"),
      });
      expect(resultWithDifferentYears).toBe("Dec 2025");

      const result = formatPeriod({
        start: dayjs("2025-12-29T00:00:00.000Z"),
        end: dayjs("2026-01-04T23:59:59.999Z"),
        timeView: "week",
        wholeStart: dayjs("2025-01-01T00:00:00.000Z"),
        wholeEnd: dayjs("2026-12-31T23:59:59.999Z"),
      });
      expect(result).toBe("Dec 29 , 2025 - Jan 4, 2026");
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle empty date ranges gracefully", () => {
      const ranges = getDateRanges({
        startDate: "2025-05-01T00:00:00.000Z",
        endDate: "2025-04-30T23:59:59.999Z", // End before start
        timeZone: "UTC",
        timeView: "day",
        weekStart: "Sunday",
      });

      expect(ranges).toEqual([]);
    });

    it("should handle very short time periods", () => {
      const ranges = getDateRanges({
        startDate: "2025-05-01T12:00:00.000Z",
        endDate: "2025-05-01T13:00:00.000Z", // 1 hour
        timeZone: "UTC",
        timeView: "day",
        weekStart: "Sunday",
      });

      expect(ranges).toHaveLength(1);
      expect(ranges[0]).toEqual({
        startDate: "2025-05-01T12:00:00.000Z",
        endDate: "2025-05-01T13:00:00.000Z",
        formattedDate: "May 1",
        formattedDateFull: "May 1",
      });
    });

    it("should handle leap year correctly", () => {
      const ranges = getDateRanges({
        startDate: "2024-02-28T00:00:00.000Z",
        endDate: "2024-03-01T23:59:59.999Z",
        timeZone: "UTC",
        timeView: "day",
        weekStart: "Sunday",
      });

      expect(ranges).toHaveLength(3); // Feb 28, Feb 29 (leap day), Mar 1
      expect(ranges[1]).toEqual({
        startDate: "2024-02-29T00:00:00.000Z",
        endDate: "2024-02-29T23:59:59.999Z",
        formattedDate: "29",
        formattedDateFull: "Feb 29",
      });
    });

    it("should handle different week start days correctly", () => {
      const ranges = getDateRanges({
        startDate: "2025-05-01T00:00:00.000Z", // Thursday
        endDate: "2025-05-07T23:59:59.999Z", // Wednesday
        timeZone: "UTC",
        timeView: "week",
        weekStart: "Thursday",
      });

      expect(ranges).toHaveLength(1);
      expect(ranges[0]).toEqual({
        startDate: "2025-05-01T00:00:00.000Z",
        endDate: "2025-05-07T23:59:59.999Z",
        formattedDate: "May 1 - 7",
        formattedDateFull: "May 1 - May 7",
      });
    });
  });
});
