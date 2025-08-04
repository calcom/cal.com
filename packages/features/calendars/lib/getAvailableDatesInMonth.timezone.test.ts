import { describe, expect, test, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import { getAvailableDatesInMonth } from "@calcom/features/calendars/lib/getAvailableDatesInMonth";
import { daysInMonth, yyyymmdd } from "@calcom/lib/dayjs";

describe("Test Suite: Date Picker", () => {
  describe("Calculates the available dates left in the month", () => {
    // *) Use right amount of days in given month. (28, 30, 31)
    test("it returns the right amount of days in a given month", () => {
      const currentDate = new Date();
      const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);

      const result = getAvailableDatesInMonth({
        browsingDate: nextMonthDate,
      });

      expect(result).toHaveLength(daysInMonth(nextMonthDate));
    });
    // *) Dates in the past are not available.
    test("it doesn't return dates that already passed", () => {
      const currentDate = new Date();
      const result = getAvailableDatesInMonth({
        browsingDate: currentDate,
      });

      expect(result).toHaveLength(daysInMonth(currentDate) - currentDate.getDate() + 1);
    });
    // *) Intersect with included dates.
    test("it intersects with given included dates", () => {
      const currentDate = new Date();
      const result = getAvailableDatesInMonth({
        browsingDate: currentDate,
        includedDates: [yyyymmdd(currentDate)],
      });

      expect(result).toHaveLength(1);
    });

    test("it translates correctly regardless of system time", () => {
      {
        // test a date in negative UTC offset
        vi.useFakeTimers().setSystemTime(new Date("2023-10-24T13:27:00.000-07:00"));

        const currentDate = new Date();
        const result = getAvailableDatesInMonth({
          browsingDate: currentDate,
        });

        expect(result).toHaveLength(daysInMonth(currentDate) - currentDate.getDate() + 1);
      }
      {
        // test a date in positive UTC offset
        vi.useFakeTimers().setSystemTime(new Date("2023-10-24T13:27:00.000+07:00"));

        const currentDate = new Date();
        const result = getAvailableDatesInMonth({
          browsingDate: currentDate,
        });

        expect(result).toHaveLength(daysInMonth(currentDate) - currentDate.getDate() + 1);
      }
      // Undo the forced time we applied earlier, reset to system default.
      vi.setSystemTime(vi.getRealSystemTime());
      vi.useRealTimers();
    });

    test("it returns the correct responses end of month", () => {
      // test a date at one minute past midnight, end of month.
      // we use dayjs() as the system timezone can still modify the Date.
      vi.useFakeTimers().setSystemTime(dayjs().endOf("month").startOf("day").add(1, "second").toDate());

      const currentDate = new Date();
      const result = getAvailableDatesInMonth({
        browsingDate: currentDate,
      });

      expect(result).toHaveLength(1);

      // Undo the forced time we applied earlier, reset to system default.
      vi.setSystemTime(vi.getRealSystemTime());
      vi.useRealTimers();
    });
  });
});
