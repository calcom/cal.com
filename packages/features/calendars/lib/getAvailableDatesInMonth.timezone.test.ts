import { describe, expect, test, vi, afterEach } from "vitest";

import dayjs from "@calcom/dayjs";
import { getAvailableDatesInMonth } from "@calcom/features/calendars/lib/getAvailableDatesInMonth";
import { daysInMonth, yyyymmdd } from "@calcom/lib/date-fns";

const getRemainingDaysInMonth = () => {
  const today = dayjs();
  const endOfMonth = today.endOf("month");
  return endOfMonth.diff(today, "day") + 1; // +1 to include today
};

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
      {
        const currentDate = new Date();
        const result = getAvailableDatesInMonth({
          browsingDate: currentDate,
        });

        expect(result).toHaveLength(daysInMonth(currentDate) - currentDate.getDate() + 1);
      }
      {
        const currentDate = dayjs().startOf("month");
        const result = getAvailableDatesInMonth({
          browsingDate: currentDate,
        });

        expect(result).toHaveLength(getRemainingDaysInMonth());
      }
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

  test("it returns the current date in selected timezone", () => {
    // Browser timezone - Asia/Kolkata UTC+5:30
    // Selected timezone - Pacific/Pago_Pago UTC-11:00
    {
      // Set browser timezone to be Asia/Kolkata UTC+5:30 with date as 20th Jul 2024, 1AM
      const browserDate = new Date("2024-07-20T01:00:00.000+05:30");
      vi.useFakeTimers().setSystemTime(browserDate);

      const browsingDate = dayjs().tz("Pacific/Pago_Pago").toDate();

      const expectedDate = "2024-07-19";

      const result = getAvailableDatesInMonth({
        browsingDate,
      });
      expect(result[0]).toBe(expectedDate);
    }

    // Browser timezone - Asia/Kolkata UTC+5:30
    // Selected timezone - Pacific/Tongatapu UTC+13:00
    {
      // Set browser timezone to be Asia/Kolkata UTC+5:30 with date as Sat, 20th Jul 2024, 9PM
      const browserDate = new Date("2024-07-20T21:00:00.000+05:30");
      vi.useFakeTimers().setSystemTime(browserDate);

      const browsingDate = dayjs().tz("Pacific/Tongatapu");
      console.log(browsingDate.format(), new Date());
      // Expected equivalent time in Pacific/Tongatapu UTC+13:00 is Sun, 21st Jul 2024, 4:30AM
      const expectedDate = "2024-07-21";

      const result = getAvailableDatesInMonth({
        browsingDate,
      });

      expect(result[0]).toEqual(expectedDate);
    }
  });

  afterEach(() => {
    vi.setSystemTime(vi.getRealSystemTime());
    vi.useRealTimers();
  });
});
