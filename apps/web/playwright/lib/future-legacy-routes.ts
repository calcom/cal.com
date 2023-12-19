import { test } from "./fixtures";

export type RouteVariant = "future" | "legacy";

const routeVariants = [/*"future",*/ "legacy"];

/**
 * Small wrapper around test.describe().
 * When using testbothFutureLegacyRoutes.describe() instead of test.describe(), this will run the specified
 * tests twice. One with the pages route, and one with the new app dir "future" route. It will also add the route variant
 * name to the test name for easier debugging.
 * Finally it also adds a parameter routeVariant to your testBothFutureAndLegacyRoutes.describe() callback, which
 * can be used to do any conditional rendering in the test for a specific route variant (should be as little
 * as possible).
 *
 * See apps/web/playwright/event-types.e2e.ts for an example.
 */
export const testBothFutureAndLegacyRoutes = {
  describe: (testName: string, testFn: (routeVariant: RouteVariant) => void) => {
    routeVariants.forEach((routeVariant) => {
      test.describe(`${testName} -- ${routeVariant}`, () => {
        if (routeVariant === "future") {
          test.beforeEach(({ context }) => {
            context.addCookies([
              { name: "x-calcom-future-routes-override", value: "1", url: "http://localhost:3000" },
            ]);
          });
        }
        testFn(routeVariant as RouteVariant);
      });
    });
  },
};
