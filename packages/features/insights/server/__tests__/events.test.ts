import { describe, expect, it } from "vitest";

import { EventsInsights } from "../events";

describe("EventsInsights", () => {
  describe("getDateRanges", () => {
    describe("UTC timezone", () => {
      const timeZone = "UTC";

      it("should handle daily ranges", () => {
        console.log("\n=== Daily Ranges Test (UTC) ===");
        const startDate = "2025-05-01T00:00:00.000Z"; // Beginning of May 1st UTC
        const endDate = "2025-05-03T23:59:59.999Z"; // End of May 3rd UTC
        console.log("Input parameters:");
        console.log("- Start date:", startDate);
        console.log("- End date:", endDate);
        console.log("- Timezone:", timeZone);
        console.log("- Time view: day");

        const ranges = EventsInsights.getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "day",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        console.log("\nResults:");
        console.log("Expected length: 3");
        console.log("Actual length:", ranges.length);
        console.log("Generated ranges:");
        ranges.forEach((range, index) => {
          console.log(`\nRange ${index + 1}:`);
          console.log("- Start:", range.startDate);
          console.log("- End:", range.endDate);
          console.log("- Formatted:", range.formattedDate);
          console.log(
            "- Duration (hours):",
            (new Date(range.endDate).getTime() - new Date(range.startDate).getTime()) / (1000 * 60 * 60)
          );
        });

        expect(ranges).toHaveLength(3);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-01T00:00:00.000Z",
          endDate: "2025-05-01T23:59:59.999Z",
          formattedDate: "May 1, 2025",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-05-02T00:00:00.000Z",
          endDate: "2025-05-02T23:59:59.999Z",
          formattedDate: "May 2, 2025",
        });
        expect(ranges[2]).toEqual({
          startDate: "2025-05-03T00:00:00.000Z",
          endDate: "2025-05-03T23:59:59.999Z",
          formattedDate: "May 3, 2025",
        });
      });

      it("should handle weekly ranges starting mid-week", () => {
        console.log("\n=== Weekly Ranges Test (UTC) ===");
        const startDate = "2025-05-01T00:00:00.000Z"; // Thursday
        const endDate = "2025-05-25T23:59:59.999Z";
        console.log("Input parameters:");
        console.log("- Start date:", startDate);
        console.log("- End date:", endDate);
        console.log("- Timezone:", timeZone);
        console.log("- Time view: week");
        console.log(
          "- Start day of week:",
          new Date(startDate).toLocaleDateString("en-US", { weekday: "long" })
        );

        const ranges = EventsInsights.getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "week",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        console.log("\nResults:");
        console.log("Expected length: 4");
        console.log("Actual length:", ranges.length);
        console.log("Generated ranges:");
        ranges.forEach((range, index) => {
          console.log(`\nWeek ${index + 1}:`);
          console.log("- Start:", range.startDate);
          console.log("- End:", range.endDate);
          console.log("- Formatted:", range.formattedDate);
          console.log(
            "- Duration (days):",
            (new Date(range.endDate).getTime() - new Date(range.startDate).getTime()) / (1000 * 60 * 60 * 24)
          );
        });

        expect(ranges).toHaveLength(4);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-01T00:00:00.000Z",
          endDate: "2025-05-04T23:59:59.999Z",
          formattedDate: "May 1 - May 4, 2025",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-05-05T00:00:00.000Z",
          endDate: "2025-05-11T23:59:59.999Z",
          formattedDate: "May 5 - May 11, 2025",
        });
        expect(ranges[3]).toEqual({
          startDate: "2025-05-19T00:00:00.000Z",
          endDate: "2025-05-25T23:59:59.999Z",
          formattedDate: "May 19 - May 25, 2025",
        });
      });

      it("should handle monthly ranges", () => {
        console.log("\n=== Monthly Ranges Test (UTC) ===");
        const startDate = "2025-05-15T00:00:00.000Z";
        const endDate = "2025-07-15T23:59:59.999Z";
        console.log("Input parameters:");
        console.log("- Start date:", startDate);
        console.log("- End date:", endDate);
        console.log("- Timezone:", timeZone);
        console.log("- Time view: month");

        const ranges = EventsInsights.getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "month",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        console.log("\nResults:");
        console.log("Expected length: 3");
        console.log("Actual length:", ranges.length);
        console.log("Generated ranges:");
        ranges.forEach((range, index) => {
          console.log(`\nMonth ${index + 1}:`);
          console.log("- Start:", range.startDate);
          console.log("- End:", range.endDate);
          console.log("- Formatted:", range.formattedDate);
          console.log(
            "- Duration (days):",
            (new Date(range.endDate).getTime() - new Date(range.startDate).getTime()) / (1000 * 60 * 60 * 24)
          );
        });

        expect(ranges).toHaveLength(3);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-15T00:00:00.000Z",
          endDate: "2025-05-31T23:59:59.999Z",
          formattedDate: "May 2025",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-06-01T00:00:00.000Z",
          endDate: "2025-06-30T23:59:59.999Z",
          formattedDate: "Jun 2025",
        });
        expect(ranges[2]).toEqual({
          startDate: "2025-07-01T00:00:00.000Z",
          endDate: "2025-07-15T23:59:59.999Z",
          formattedDate: "Jul 2025",
        });
      });

      it("should handle yearly ranges", () => {
        console.log("\n=== Yearly Ranges Test (UTC) ===");
        const startDate = "2025-06-15T00:00:00.000Z";
        const endDate = "2027-03-15T23:59:59.999Z";
        console.log("Input parameters:");
        console.log("- Start date:", startDate);
        console.log("- End date:", endDate);
        console.log("- Timezone:", timeZone);
        console.log("- Time view: year");

        const ranges = EventsInsights.getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "year",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        console.log("\nResults:");
        console.log("Expected length: 3");
        console.log("Actual length:", ranges.length);
        console.log("Generated ranges:");
        ranges.forEach((range, index) => {
          console.log(`\nYear ${index + 1}:`);
          console.log("- Start:", range.startDate);
          console.log("- End:", range.endDate);
          console.log("- Formatted:", range.formattedDate);
          console.log(
            "- Duration (days):",
            (new Date(range.endDate).getTime() - new Date(range.startDate).getTime()) / (1000 * 60 * 60 * 24)
          );
        });

        expect(ranges).toHaveLength(3);
        expect(ranges[0]).toEqual({
          startDate: "2025-06-15T00:00:00.000Z",
          endDate: "2025-12-31T23:59:59.999Z",
          formattedDate: "2025",
        });
        expect(ranges[1]).toEqual({
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: "2026-12-31T23:59:59.999Z",
          formattedDate: "2026",
        });
        expect(ranges[2]).toEqual({
          startDate: "2027-01-01T00:00:00.000Z",
          endDate: "2027-03-15T23:59:59.999Z",
          formattedDate: "2027",
        });
      });

      it("should handle same day ranges", () => {
        console.log("\n=== Same Day Ranges Test (UTC) ===");
        const startDate = "2025-05-01T00:00:00.000Z";
        const endDate = "2025-05-01T23:59:59.999Z";
        console.log("Input parameters:");
        console.log("- Start date:", startDate);
        console.log("- End date:", endDate);
        console.log("- Timezone:", timeZone);
        console.log("- Time view: day");

        const ranges = EventsInsights.getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "day",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        console.log("\nResults:");
        console.log("Expected length: 1");
        console.log("Actual length:", ranges.length);
        console.log("Generated ranges:");
        ranges.forEach((range, index) => {
          console.log(`\nRange ${index + 1}:`);
          console.log("- Start:", range.startDate);
          console.log("- End:", range.endDate);
          console.log("- Formatted:", range.formattedDate);
          console.log(
            "- Duration (hours):",
            (new Date(range.endDate).getTime() - new Date(range.startDate).getTime()) / (1000 * 60 * 60)
          );
        });

        expect(ranges).toHaveLength(1);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-01T00:00:00.000Z",
          endDate: "2025-05-01T23:59:59.999Z",
          formattedDate: "May 1, 2025",
        });
      });
    });

    describe("Europe/Paris timezone", () => {
      const timeZone = "Europe/Paris";

      it("should handle daily ranges across DST", () => {
        console.log("\n=== DST Daily Ranges Test (Europe/Paris) ===");
        const startDate = "2025-03-29T23:00:00.000Z"; // March 30th 00:00 Paris time
        const endDate = "2025-03-31T21:59:59.999Z"; // April 1st 23:59:59 Paris time
        console.log("Input parameters:");
        console.log("- Start date:", startDate);
        console.log("- End date:", endDate);
        console.log("- Timezone:", timeZone);
        console.log("- Time view: day");
        console.log("- Note: DST begins on Sunday, March 30, 2025, at 3:00 AM local time");

        const ranges = EventsInsights.getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "day",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        console.log("\nResults:");
        console.log("Expected length: 3");
        console.log("Actual length:", ranges.length);
        console.log("Generated ranges:");
        ranges.forEach((range, index) => {
          const duration = new Date(range.endDate).getTime() - new Date(range.startDate).getTime();
          console.log(`\nRange ${index + 1}:`);
          console.log("- Start:", range.startDate);
          console.log("- End:", range.endDate);
          console.log("- Formatted:", range.formattedDate);
          console.log("- Duration (hours):", duration / (1000 * 60 * 60));
          console.log("- Is DST affected:", duration < 24 * 60 * 60 * 1000);
        });

        expect(ranges).toHaveLength(3);
        // DST begins on Sunday, March 30, 2025, at 3:00 AM local time
        expect(ranges[0]).toEqual({
          startDate: "2025-03-29T23:00:00.000Z", // March 30th 00:00 Paris time
          endDate: "2025-03-30T21:59:59.999Z", // March 30th 23:59:59 Paris time
          formattedDate: "Mar 30, 2025",
        });
        expect(new Date(ranges[0].endDate).getTime() - new Date(ranges[0].startDate).getTime()).toBeLessThan(
          23 * 60 * 60 * 1000
        ); // 1 hour is skipped
        expect(ranges[1]).toEqual({
          startDate: "2025-03-30T22:00:00.000Z", // March 31st 00:00 Paris time
          endDate: "2025-03-31T21:59:59.999Z", // March 31st 23:59:59 Paris time
          formattedDate: "Mar 31, 2025",
        });
      });

      it("should handle weekly ranges", () => {
        console.log("\n=== Weekly Ranges Test (Europe/Paris) ===");
        const startDate = "2025-05-15T22:00:00.000Z"; // May 16th 00:00 Paris time
        const endDate = "2025-05-29T21:59:59.999Z"; // May 29th 23:59:59 Paris time
        console.log("Input parameters:");
        console.log("- Start date:", startDate);
        console.log("- End date:", endDate);
        console.log("- Timezone:", timeZone);
        console.log("- Time view: week");

        const ranges = EventsInsights.getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "week",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        console.log("\nResults:");
        console.log("Expected length: 2");
        console.log("Actual length:", ranges.length);
        console.log("Generated ranges:");
        ranges.forEach((range, index) => {
          console.log(`\nWeek ${index + 1}:`);
          console.log("- Start:", range.startDate);
          console.log("- End:", range.endDate);
          console.log("- Formatted:", range.formattedDate);
          console.log(
            "- Duration (days):",
            (new Date(range.endDate).getTime() - new Date(range.startDate).getTime()) / (1000 * 60 * 60 * 24)
          );
        });

        expect(ranges).toHaveLength(2);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-15T22:00:00.000Z",
          endDate: "2025-05-22T21:59:59.999Z",
          formattedDate: "May 16 - May 22, 2025",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-05-22T22:00:00.000Z",
          endDate: "2025-05-29T21:59:59.999Z",
          formattedDate: "May 23 - May 29, 2025",
        });
      });

      it("should handle monthly ranges", () => {
        console.log("\n=== Monthly Ranges Test (Europe/Paris) ===");
        const startDate = "2025-05-31T22:00:00.000Z"; // June 1st 00:00 Paris time
        const endDate = "2025-07-31T21:59:59.999Z"; // July 31st 23:59:59 Paris time
        console.log("Input parameters:");
        console.log("- Start date:", startDate);
        console.log("- End date:", endDate);
        console.log("- Timezone:", timeZone);
        console.log("- Time view: month");

        const ranges = EventsInsights.getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "month",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        console.log("\nResults:");
        console.log("Expected length: 2");
        console.log("Actual length:", ranges.length);
        console.log("Generated ranges:");
        ranges.forEach((range, index) => {
          console.log(`\nMonth ${index + 1}:`);
          console.log("- Start:", range.startDate);
          console.log("- End:", range.endDate);
          console.log("- Formatted:", range.formattedDate);
          console.log(
            "- Duration (days):",
            (new Date(range.endDate).getTime() - new Date(range.startDate).getTime()) / (1000 * 60 * 60 * 24)
          );
        });

        expect(ranges).toHaveLength(2);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-31T22:00:00.000Z",
          endDate: "2025-06-30T21:59:59.999Z",
          formattedDate: "Jun 2025",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-06-30T22:00:00.000Z",
          endDate: "2025-07-31T21:59:59.999Z",
          formattedDate: "Jul 2025",
        });
      });
    });

    describe("Asia/Seoul timezone", () => {
      const timeZone = "Asia/Seoul";

      it("should handle daily ranges", () => {
        console.log("\n=== Daily Ranges Test (Asia/Seoul) ===");
        const startDate = "2025-05-14T15:00:00.000Z"; // May 15th 00:00 Seoul time
        const endDate = "2025-05-16T14:59:59.999Z"; // May 16th 23:59:59 Seoul time
        console.log("Input parameters:");
        console.log("- Start date:", startDate);
        console.log("- End date:", endDate);
        console.log("- Timezone:", timeZone);
        console.log("- Time view: day");

        const ranges = EventsInsights.getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "day",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        console.log("\nResults:");
        console.log("Expected length: 2");
        console.log("Actual length:", ranges.length);
        console.log("Generated ranges:");
        ranges.forEach((range, index) => {
          console.log(`\nRange ${index + 1}:`);
          console.log("- Start:", range.startDate);
          console.log("- End:", range.endDate);
          console.log("- Formatted:", range.formattedDate);
          console.log(
            "- Duration (hours):",
            (new Date(range.endDate).getTime() - new Date(range.startDate).getTime()) / (1000 * 60 * 60)
          );
        });

        expect(ranges).toHaveLength(2);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-14T15:00:00.000Z",
          endDate: "2025-05-15T14:59:59.999Z",
          formattedDate: "May 15, 2025",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-05-15T15:00:00.000Z",
          endDate: "2025-05-16T14:59:59.999Z",
          formattedDate: "May 16, 2025",
        });
      });

      it("should handle weekly ranges", () => {
        console.log("\n=== Weekly Ranges Test (Asia/Seoul) ===");
        const startDate = "2025-05-11T15:00:00.000Z"; // May 12th 00:00 Seoul time (Monday)
        const endDate = "2025-05-25T14:59:59.999Z"; // May 25th 23:59:59 Seoul time (Sunday)
        console.log("Input parameters:");
        console.log("- Start date:", startDate);
        console.log("- End date:", endDate);
        console.log("- Timezone:", timeZone);
        console.log("- Time view: week");
        console.log(
          "- Start day of week:",
          new Date(startDate).toLocaleDateString("en-US", { weekday: "long" })
        );

        const ranges = EventsInsights.getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "week",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        console.log("\nResults:");
        console.log("Expected length: 2");
        console.log("Actual length:", ranges.length);
        console.log("Generated ranges:");
        ranges.forEach((range, index) => {
          console.log(`\nWeek ${index + 1}:`);
          console.log("- Start:", range.startDate);
          console.log("- End:", range.endDate);
          console.log("- Formatted:", range.formattedDate);
          console.log(
            "- Duration (days):",
            (new Date(range.endDate).getTime() - new Date(range.startDate).getTime()) / (1000 * 60 * 60 * 24)
          );
        });

        expect(ranges).toHaveLength(2);
        expect(ranges[0]).toEqual({
          startDate: "2025-05-11T15:00:00.000Z",
          endDate: "2025-05-18T14:59:59.999Z",
          formattedDate: "May 12 - May 18, 2025",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-05-18T15:00:00.000Z",
          endDate: "2025-05-25T14:59:59.999Z",
          formattedDate: "May 19 - May 25, 2025",
        });
      });

      it("should handle monthly ranges", () => {
        console.log("\n=== Monthly Ranges Test (Asia/Seoul) ===");
        const startDate = "2025-04-30T15:00:00.000Z"; // May 1st 00:00 Seoul time
        const endDate = "2025-06-30T14:59:59.999Z"; // June 30th 23:59:59 Seoul time
        console.log("Input parameters:");
        console.log("- Start date:", startDate);
        console.log("- End date:", endDate);
        console.log("- Timezone:", timeZone);
        console.log("- Time view: month");

        const ranges = EventsInsights.getDateRanges({
          startDate,
          endDate,
          timeZone,
          timeView: "month",
        });

        if (!ranges) {
          throw new Error("Expected ranges to be defined");
        }

        console.log("\nResults:");
        console.log("Expected length: 2");
        console.log("Actual length:", ranges.length);
        console.log("Generated ranges:");
        ranges.forEach((range, index) => {
          console.log(`\nMonth ${index + 1}:`);
          console.log("- Start:", range.startDate);
          console.log("- End:", range.endDate);
          console.log("- Formatted:", range.formattedDate);
          console.log(
            "- Duration (days):",
            (new Date(range.endDate).getTime() - new Date(range.startDate).getTime()) / (1000 * 60 * 60 * 24)
          );
        });

        expect(ranges).toHaveLength(2);
        expect(ranges[0]).toEqual({
          startDate: "2025-04-30T15:00:00.000Z",
          endDate: "2025-05-31T14:59:59.999Z",
          formattedDate: "May 2025",
        });
        expect(ranges[1]).toEqual({
          startDate: "2025-05-31T15:00:00.000Z",
          endDate: "2025-06-30T14:59:59.999Z",
          formattedDate: "Jun 2025",
        });
      });
    });

    it("should return empty array for invalid timeView", () => {
      console.log("\n=== Invalid TimeView Test ===");
      const startDate = "2025-05-01T00:00:00.000Z";
      const endDate = "2025-05-03T23:59:59.999Z";
      const timeZone = "UTC";
      console.log("Input parameters:");
      console.log("- Start date:", startDate);
      console.log("- End date:", endDate);
      console.log("- Timezone:", timeZone);
      console.log("- Time view: invalid");

      const ranges = EventsInsights.getDateRanges({
        startDate,
        endDate,
        timeZone,
        // @ts-expect-error - Testing invalid timeView value
        timeView: "invalid",
      });

      if (!ranges) {
        throw new Error("Expected ranges to be defined");
      }

      console.log("\nResults:");
      console.log("Expected length: 0");
      console.log("Actual length:", ranges.length);
      console.log("Generated ranges:", ranges);

      expect(ranges).toEqual([]);
    });
  });
});
