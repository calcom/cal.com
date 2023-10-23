import { describe, expect, test } from "vitest";

import { getAvailableDatesInMonth } from "@calcom/features/calendars/lib/getAvailableDatesInMonth";
import { daysInMonth, yyyymmdd } from "@calcom/lib/date-fns";

describe("Test Suite: Date Picker", () => {
  describe("Calculates the available dates left in the month", () => {
    // *) Use right amount of days in given month. (28, 30, 31)
    test("it returns the right amount of days in a given month", () => {
      const currentDate = new Date();
      const nextMonthDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1));

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
  });
});
