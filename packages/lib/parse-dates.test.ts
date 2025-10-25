import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";

import { parseRecurringDates } from "./parse-dates";

describe("parseRecurringDates", () => {
  describe("timezone handling for recurring events", () => {
    it("should correctly generate recurring dates in CET timezone regardless of execution environment timezone", () => {
      const userTimezone = "Europe/Paris"; // CET/CEST

      const startDate = "2024-01-15T10:00:00"; // Time in user's local time (CET)

      const recurringEvent = {
        freq: 2, // WEEKLY (from rrule)
        interval: 1,
      };
      const recurringCount = 3;

      const [, dates] = parseRecurringDates(
        {
          startDate,
          timeZone: userTimezone,
          recurringEvent,
          recurringCount,
          withDefaultTimeFormat: true,
        },
        "en"
      );

      expect(dates).toHaveLength(3);

      dates.forEach((date, index) => {
        const dateInUserTz = dayjs(date).tz(userTimezone);
        const hour = dateInUserTz.hour();
        const minute = dateInUserTz.minute();

        expect(hour).toBe(10);
        expect(minute).toBe(0);

        if (index > 0) {
          const prevDate = dayjs(dates[index - 1]);
          const daysDiff = dateInUserTz.diff(prevDate, "day");
          expect(daysDiff).toBe(7);
        }
      });

      expect(dayjs(dates[0]).tz(userTimezone).format("YYYY-MM-DD HH:mm")).toBe("2024-01-15 10:00");
      expect(dayjs(dates[1]).tz(userTimezone).format("YYYY-MM-DD HH:mm")).toBe("2024-01-22 10:00");
      expect(dayjs(dates[2]).tz(userTimezone).format("YYYY-MM-DD HH:mm")).toBe("2024-01-29 10:00");
    });

    it("should handle DST transitions correctly for recurring events in CET", () => {
      const userTimezone = "Europe/Paris";

      const startDate = "2024-03-18T10:00:00";

      const recurringEvent = {
        freq: 2, // WEEKLY
        interval: 1,
      };
      const recurringCount = 3;

      const [, dates] = parseRecurringDates(
        {
          startDate,
          timeZone: userTimezone,
          recurringEvent,
          recurringCount,
          withDefaultTimeFormat: true,
        },
        "en"
      );

      expect(dates).toHaveLength(3);

      dates.forEach((date) => {
        const dateInUserTz = dayjs(date).tz(userTimezone);
        expect(dateInUserTz.hour()).toBe(10);
        expect(dateInUserTz.minute()).toBe(0);
      });

      expect(dayjs(dates[0]).tz(userTimezone).format("YYYY-MM-DD HH:mm")).toBe("2024-03-18 10:00");
      expect(dayjs(dates[1]).tz(userTimezone).format("YYYY-MM-DD HH:mm")).toBe("2024-03-25 10:00");
      // Central European Time (CET) changes to Central European Summer Time (CEST) on 31 March 2024
      expect(dayjs(dates[2]).tz(userTimezone).format("YYYY-MM-DD HH:mm")).toBe("2024-04-01 10:00");
    });
  });
});
