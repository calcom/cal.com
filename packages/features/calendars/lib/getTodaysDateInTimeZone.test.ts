import { describe, expect, test, vi } from "vitest";

import { getTodaysDateInTimeZone } from "@calcom/features/calendars/lib/getTodaysDateInTimeZone";

describe("Test Suite: Date Picker", () => {
  describe("fn getTodaysDateInTimeZone()", () => {
    test("it returns the current date of preferred timezone", () => {
      // Browser timezone - Asia/Kolkata
      // Preferred timezone - Pacific/Pago_Pago
      {
        // Set browser timezone to be Asia/Kolkata UTC+5:30 with date as 20th Jul 2024, 1AM
        const browserDate = new Date("2024-07-20T01:00:00.000+05:30");
        console.log(browserDate);
        vi.useFakeTimers().setSystemTime(browserDate);

        // Expected equivalent time in Pacific/Pago_Pago UTC-11:00 is 19th Jul 2024, 8:30AM
        const expectedDate = "2024-07-19T08:30:00.000Z";

        const calculatedCurrentDateInTimeZone = getTodaysDateInTimeZone("Pacific/Pago_Pago");

        expect(calculatedCurrentDateInTimeZone.toISOString()).toEqual(expectedDate);
      }

      // Undo the forced time we applied earlier, reset to system default.
      vi.setSystemTime(vi.getRealSystemTime());
      vi.useRealTimers();
    });
  });
});
