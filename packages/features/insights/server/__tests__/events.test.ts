import "../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";

import { getTimeView, getDateRanges, formatPeriod } from "../insightsDateUtils";

describe("EventsInsights", () => {
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

      it("should handle weekly ranges with Sunday start", () => {
        const startDate = "2025-05-01T00:00:00.000Z"; // Thursday
        const endDate = "2025-05-14T23:59:59.999Z"; // Wednesday

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
          endDate: "2025-05-14T23:59:59.999Z",
          formattedDate: "May 11 - 14",
          formattedDateFull: "May 11 - May 14",
        });
      });

      it("should handle weekly ranges with Saturday start", () => {
        const startDate = "2025-05-01T00:00:00.000Z"; // Thursday
        const endDate = "2025-05-14T23:59:59.999Z"; // Wednesday

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "week",
          weekStart: "Saturday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        expect(ranges).toHaveLength(3);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-01T00:00:00.000Z",
          endDate: "2025-05-02T23:59:59.999Z",
          formattedDate: "May 1 - 2",
          formattedDateFull: "May 1 - May 2",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-05-03T00:00:00.000Z",
          endDate: "2025-05-09T23:59:59.999Z",
          formattedDate: "May 3 - 9",
          formattedDateFull: "May 3 - May 9",
        });
        expect(ranges[2]).toEqual({
          startDate: "2025-05-10T00:00:00.000Z",
          endDate: "2025-05-14T23:59:59.999Z",
          formattedDate: "May 10 - 14",
          formattedDateFull: "May 10 - May 14",
        });
      });
    });
  });

  describe("formatPeriod", () => {
    describe("Day View", () => {
      describe("Beginning of data (wholeStart === start)", () => {
        it("should always show month for the first day when same year", () => {
          const result = formatPeriod({
            start: dayjs("2024-01-15"),
            end: dayjs("2024-01-15"),
            timeView: "day",
            wholeStart: dayjs("2024-01-15"), // Same as start
            wholeEnd: dayjs("2024-01-20"),
          });
          expect(result).toBe("Jan 15");
        });

        it("should always show month for the first day when different years", () => {
          const result = formatPeriod({
            start: dayjs("2024-01-15"),
            end: dayjs("2024-01-15"),
            timeView: "day",
            wholeStart: dayjs("2024-01-15"), // Same as start
            wholeEnd: dayjs("2025-02-01"),
          });
          expect(result).toBe("Jan 15, 2024");
        });
      });

      describe("First day of month (start.date() === 1)", () => {
        it("should show month for 1st day of month when same year", () => {
          const result = formatPeriod({
            start: dayjs("2024-02-01"),
            end: dayjs("2024-02-01"),
            timeView: "day",
            wholeStart: dayjs("2024-01-15"),
            wholeEnd: dayjs("2024-02-10"),
          });
          expect(result).toBe("Feb 1");
        });

        it("should show month for 1st day of month when different years", () => {
          const result = formatPeriod({
            start: dayjs("2024-02-01"),
            end: dayjs("2024-02-01"),
            timeView: "day",
            wholeStart: dayjs("2023-12-15"),
            wholeEnd: dayjs("2024-03-01"),
          });
          expect(result).toBe("Feb 1, 2024");
        });
      });

      describe("Regular days (not first day, not 1st of month)", () => {
        it("should omit month for regular days when same year", () => {
          const result = formatPeriod({
            start: dayjs("2024-01-16"),
            end: dayjs("2024-01-16"),
            timeView: "day",
            wholeStart: dayjs("2024-01-15"),
            wholeEnd: dayjs("2024-01-20"),
          });
          expect(result).toBe("16");
        });

        it("should omit month but show year for regular days when different years", () => {
          const result = formatPeriod({
            start: dayjs("2024-01-16"),
            end: dayjs("2024-01-16"),
            timeView: "day",
            wholeStart: dayjs("2023-12-15"),
            wholeEnd: dayjs("2024-02-01"),
          });
          expect(result).toBe("16, 2024");
        });
      });

      describe("Edge cases", () => {
        it("should show month when start is both beginning of data AND 1st of month", () => {
          const result = formatPeriod({
            start: dayjs("2024-01-01"),
            end: dayjs("2024-01-01"),
            timeView: "day",
            wholeStart: dayjs("2024-01-01"), // Same as start AND 1st of month
            wholeEnd: dayjs("2024-01-05"),
          });
          expect(result).toBe("Jan 1");
        });

        it("should show month for last day of month if it's 1st of month (edge case)", () => {
          // This tests the case where start.date() === 1 takes precedence
          const result = formatPeriod({
            start: dayjs("2024-03-01"),
            end: dayjs("2024-03-01"),
            timeView: "day",
            wholeStart: dayjs("2024-02-28"),
            wholeEnd: dayjs("2024-03-05"),
          });
          expect(result).toBe("Mar 1");
        });

        it("should omit month for end of month when not 1st and not beginning", () => {
          const result = formatPeriod({
            start: dayjs("2024-01-31"),
            end: dayjs("2024-01-31"),
            timeView: "day",
            wholeStart: dayjs("2024-01-15"),
            wholeEnd: dayjs("2024-02-05"),
          });
          expect(result).toBe("31");
        });
      });

      describe("Real-world scenarios", () => {
        it("should format a range from Jan 15 to Jan 20 correctly", () => {
          // Simulating how getDateRanges would call formatPeriod for each day
          const wholeStart = dayjs("2024-01-15");
          const wholeEnd = dayjs("2024-01-20");

          const results: string[] = [];
          for (let i = 0; i <= 5; i++) {
            const currentDay = wholeStart.add(i, "day");
            results.push(
              formatPeriod({
                start: currentDay,
                end: currentDay,
                timeView: "day",
                wholeStart,
                wholeEnd,
              })
            );
          }

          expect(results).toEqual(["Jan 15", "16", "17", "18", "19", "20"]);
        });

        it("should format a range from Jan 30 to Feb 3 correctly", () => {
          // Simulating month transition
          const wholeStart = dayjs("2024-01-30");
          const wholeEnd = dayjs("2024-02-03");

          const results: string[] = [];
          let currentDay = wholeStart;
          while (currentDay.isBefore(wholeEnd) || currentDay.isSame(wholeEnd)) {
            results.push(
              formatPeriod({
                start: currentDay,
                end: currentDay,
                timeView: "day",
                wholeStart,
                wholeEnd,
              })
            );
            currentDay = currentDay.add(1, "day");
          }

          expect(results).toEqual(["Jan 30", "31", "Feb 1", "2", "3"]);
        });

        it("should format a range from Dec 30, 2023 to Jan 2, 2024 correctly", () => {
          // Simulating year transition with different years
          const wholeStart = dayjs("2023-12-30");
          const wholeEnd = dayjs("2024-01-02");

          const results: string[] = [];
          let currentDay = wholeStart;
          while (currentDay.isBefore(wholeEnd) || currentDay.isSame(wholeEnd)) {
            results.push(
              formatPeriod({
                start: currentDay,
                end: currentDay,
                timeView: "day",
                wholeStart,
                wholeEnd,
              })
            );
            currentDay = currentDay.add(1, "day");
          }

          expect(results).toEqual(["Dec 30, 2023", "31, 2023", "Jan 1, 2024", "2, 2024"]);
        });

        it("should format a single day range correctly", () => {
          const result = formatPeriod({
            start: dayjs("2024-01-15"),
            end: dayjs("2024-01-15"),
            timeView: "day",
            wholeStart: dayjs("2024-01-15"),
            wholeEnd: dayjs("2024-01-15"),
          });

          expect(result).toBe("Jan 15");
        });
      });
    });

    describe("Week View", () => {
      describe("Same month", () => {
        it("should format dates without year when wholeStart and wholeEnd are same year", () => {
          const result = formatPeriod({
            start: dayjs("2024-01-01"),
            end: dayjs("2024-01-07"),
            timeView: "week",
            wholeStart: dayjs("2024-01-01"),
            wholeEnd: dayjs("2024-12-31"),
          });
          expect(result).toBe("Jan 1 - 7");
        });

        it("should format dates with year when wholeStart and wholeEnd are different years", () => {
          const result = formatPeriod({
            start: dayjs("2024-01-01"),
            end: dayjs("2024-01-07"),
            timeView: "week",
            wholeStart: dayjs("2023-12-01"),
            wholeEnd: dayjs("2024-02-01"),
          });
          expect(result).toBe("Jan 1 - 7, 2024");
        });
      });

      describe("Different months", () => {
        it("should format dates without year when wholeStart and wholeEnd are same year", () => {
          const result = formatPeriod({
            start: dayjs("2024-01-29"),
            end: dayjs("2024-02-04"),
            timeView: "week",
            wholeStart: dayjs("2024-01-01"),
            wholeEnd: dayjs("2024-12-31"),
          });
          expect(result).toBe("Jan 29 - Feb 4");
        });

        it("should format dates with year when wholeStart and wholeEnd are different years", () => {
          const result = formatPeriod({
            start: dayjs("2024-01-29"),
            end: dayjs("2024-02-04"),
            timeView: "week",
            wholeStart: dayjs("2023-12-01"),
            wholeEnd: dayjs("2024-03-01"),
          });
          expect(result).toBe("Jan 29 - Feb 4, 2024");
        });
      });

      describe("Different years", () => {
        it("should format dates with respective years when start and end span different years", () => {
          const result = formatPeriod({
            start: dayjs("2023-12-31"),
            end: dayjs("2024-01-06"),
            timeView: "week",
            wholeStart: dayjs("2023-12-01"),
            wholeEnd: dayjs("2024-01-31"),
          });
          expect(result).toBe("Dec 31 , 2023 - Jan 6, 2024");
        });
      });
    });

    describe("Month View", () => {
      it("should format month without year when wholeStart and wholeEnd are same year", () => {
        const result = formatPeriod({
          start: dayjs("2024-01-01"),
          end: dayjs("2024-01-31"),
          timeView: "month",
          wholeStart: dayjs("2024-01-01"),
          wholeEnd: dayjs("2024-12-31"),
        });
        expect(result).toBe("Jan");
      });

      it("should format month with year when wholeStart and wholeEnd are different years", () => {
        const result = formatPeriod({
          start: dayjs("2024-01-01"),
          end: dayjs("2024-01-31"),
          timeView: "month",
          wholeStart: dayjs("2023-12-01"),
          wholeEnd: dayjs("2024-02-01"),
        });
        expect(result).toBe("Jan 2024");
      });
    });

    describe("Year View", () => {
      it("should format year regardless of wholeStart and wholeEnd values", () => {
        const resultWithSameYear = formatPeriod({
          start: dayjs("2024-01-01"),
          end: dayjs("2024-12-31"),
          timeView: "year",
          wholeStart: dayjs("2024-01-01"),
          wholeEnd: dayjs("2024-12-31"),
        });
        expect(resultWithSameYear).toBe("2024");

        const resultWithDifferentYears = formatPeriod({
          start: dayjs("2024-01-01"),
          end: dayjs("2024-12-31"),
          timeView: "year",
          wholeStart: dayjs("2023-12-01"),
          wholeEnd: dayjs("2025-01-01"),
        });
        expect(resultWithDifferentYears).toBe("2024");
      });
    });

    describe("Invalid View", () => {
      it("should return empty string for invalid timeView", () => {
        const result = formatPeriod({
          start: dayjs("2024-01-01"),
          end: dayjs("2024-01-01"),
          timeView: "invalid" as any,
          wholeStart: dayjs("2024-01-01"),
          wholeEnd: dayjs("2024-12-31"),
        });
        expect(result).toBe("");
      });
    });
  });

  describe("getTimeView", () => {
    it("should return year for ranges over 365 days", () => {
      const result = getTimeView("2024-01-01T00:00:00.000Z", "2025-02-01T00:00:00.000Z");
      expect(result).toBe("year");
    });

    it("should return month for ranges between 90 and 365 days", () => {
      const result = getTimeView("2024-01-01T00:00:00.000Z", "2024-05-01T00:00:00.000Z");
      expect(result).toBe("month");
    });

    it("should return week for ranges between 14 and 90 days", () => {
      const result = getTimeView("2024-01-01T00:00:00.000Z", "2024-02-01T00:00:00.000Z");
      expect(result).toBe("week");
    });

    it("should return day for ranges under 14 days", () => {
      const result = getTimeView("2024-01-01T00:00:00.000Z", "2024-01-10T00:00:00.000Z");
      expect(result).toBe("day");
    });

    it("should handle same day range", () => {
      const result = getTimeView("2024-01-01T00:00:00.000Z", "2024-01-01T23:59:59.999Z");
      expect(result).toBe("day");
    });
  });

  describe("getDateRanges - Formatting Comparison", () => {
    const timeZone = "UTC";

    describe("Daily view formatting differences", () => {
      it("should show smart vs full formatting for consecutive days", () => {
        const startDate = "2024-01-15T00:00:00.000Z";
        const endDate = "2024-01-19T23:59:59.999Z";

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "day",
          weekStart: "Monday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        expect(ranges).toHaveLength(5);

        const formattedDates = ranges.map((r) => r.formattedDate);
        const formattedDatesFull = ranges.map((r) => r.formattedDateFull);

        expect(formattedDates).toEqual(["Jan 15", "16", "17", "18", "19"]);

        expect(formattedDatesFull).toEqual(["Jan 15", "Jan 16", "Jan 17", "Jan 18", "Jan 19"]);
      });

      it("should show formatting differences across month boundaries", () => {
        const startDate = "2024-01-30T00:00:00.000Z";
        const endDate = "2024-02-02T23:59:59.999Z";

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "day",
          weekStart: "Monday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        expect(ranges).toHaveLength(4);

        const formattedDates = ranges.map((r) => r.formattedDate);
        const formattedDatesFull = ranges.map((r) => r.formattedDateFull);

        expect(formattedDates).toEqual(["Jan 30", "31", "Feb 1", "2"]);

        expect(formattedDatesFull).toEqual(["Jan 30", "Jan 31", "Feb 1", "Feb 2"]);
      });
    });

    describe("Weekly view formatting differences", () => {
      it("should show smart vs full formatting for weekly ranges", () => {
        const startDate = "2024-01-15T00:00:00.000Z"; // Monday
        const endDate = "2024-01-28T23:59:59.999Z"; // Sunday

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

        expect(ranges).toHaveLength(2);

        const formattedDates = ranges.map((r) => r.formattedDate);
        const formattedDatesFull = ranges.map((r) => r.formattedDateFull);

        expect(formattedDates).toEqual(["Jan 15 - 21", "Jan 22 - 28"]);

        expect(formattedDatesFull).toEqual(["Jan 15 - Jan 21", "Jan 22 - Jan 28"]);
      });

      it("should show formatting differences for cross-month weekly ranges", () => {
        const startDate = "2024-01-29T00:00:00.000Z"; // Monday
        const endDate = "2024-02-11T23:59:59.999Z"; // Sunday

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

        expect(ranges).toHaveLength(2);

        const formattedDates = ranges.map((r) => r.formattedDate);
        const formattedDatesFull = ranges.map((r) => r.formattedDateFull);

        expect(formattedDates).toEqual(["Jan 29 - Feb 4", "Feb 5 - 11"]);

        expect(formattedDatesFull).toEqual(["Jan 29 - Feb 4", "Feb 5 - Feb 11"]);
      });
    });

    describe("Monthly view formatting differences", () => {
      it("should show consistent formatting for monthly ranges", () => {
        const startDate = "2024-01-15T00:00:00.000Z";
        const endDate = "2024-03-15T23:59:59.999Z";

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "month",
          weekStart: "Monday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        expect(ranges).toHaveLength(3);

        const formattedDates = ranges.map((r) => r.formattedDate);
        const formattedDatesFull = ranges.map((r) => r.formattedDateFull);

        expect(formattedDates).toEqual(["Jan", "Feb", "Mar"]);

        expect(formattedDatesFull).toEqual(["Jan", "Feb", "Mar"]);
      });
    });

    describe("Real-world usage examples", () => {
      it("should demonstrate practical differences for chart display", () => {
        // Simulate a common analytics scenario: 7 days of data
        const startDate = "2024-01-15T00:00:00.000Z";
        const endDate = "2024-01-21T23:59:59.999Z";

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "day",
          weekStart: "Monday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        const formattedDates = ranges.map((r) => r.formattedDate);
        const formattedDatesFull = ranges.map((r) => r.formattedDateFull);

        expect(formattedDates).toEqual(["Jan 15", "16", "17", "18", "19", "20", "21"]);

        expect(formattedDatesFull).toEqual([
          "Jan 15",
          "Jan 16",
          "Jan 17",
          "Jan 18",
          "Jan 19",
          "Jan 20",
          "Jan 21",
        ]);
      });

      it("should show benefits of full formatting for data export", () => {
        // Simulate data that might be exported or used in external systems
        const startDate = "2024-01-30T00:00:00.000Z";
        const endDate = "2024-02-05T23:59:59.999Z";

        const ranges = getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "day",
          weekStart: "Monday",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        const formattedDates = ranges.map((r) => r.formattedDate);
        const formattedDatesFull = ranges.map((r) => r.formattedDateFull);

        expect(formattedDates).toEqual(["Jan 30", "31", "Feb 1", "2", "3", "4", "5"]);

        expect(formattedDatesFull).toEqual(["Jan 30", "Jan 31", "Feb 1", "Feb 2", "Feb 3", "Feb 4", "Feb 5"]);
      });
    });
  });
});
