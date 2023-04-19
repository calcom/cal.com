import { test } from "./fixtures";

export type BookerVariants = "new-booker" | "old-booker";

const bookerVariants = ["new-booker", "old-booker"];

/**
 * Small wrapper around test.describe().
 * When using testbothBookers.describe() instead of test.describe(), this will run the specified
 * tests twice. One with the old booker, and one with the new booker. It will also add the booker variant
 * name to the test name for easier debugging.
 * Finally it also adds a parameter bookerVariant to your testBothBooker.describe() callback, which
 * can be used to do any conditional rendering in the test for a specific booker variant (should be as little
 * as possible).
 *
 * See apps/web/playwright/booking-pages.e2e.ts for an example.
 */
export const testBothBookers = {
  describe: (testName: string, testFn: (bookerVariant: BookerVariants) => void) => {
    bookerVariants.forEach((bookerVariant) => {
      test.describe(`${testName} -- ${bookerVariant}`, () => {
        if (bookerVariant === "new-booker") {
          test.beforeEach(({ context }) => {
            context.addCookies([{ name: "new-booker-enabled", value: "true", url: "http://localhost:3000" }]);
          });
        }
        testFn(bookerVariant as BookerVariants);
      });
    });
  },
};
